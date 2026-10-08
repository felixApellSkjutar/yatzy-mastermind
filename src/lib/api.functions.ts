// All data access for the app. Each handler checks the signed-in user itself.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { finalizeGame, isGuestId } from "@/yatzy/finalize";
import type { Game, Me, Player } from "@/yatzy/types";

const server = () => Promise.all([import("./db.server"), import("./auth.server")]);

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(8, "Password must be at least 8 characters").max(200);
const displayName = z.string().trim().min(1).max(40);

const gameSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().max(120),
    layoutId: z.string().max(64),
    strategyId: z.string().max(64),
    playerIds: z.array(z.string().max(64)).min(1).max(12),
    guests: z.record(z.string().max(40)).optional(),
    rounds: z.number().int().min(1).max(10),
    sheets: z.array(z.record(z.record(z.number().nullable()))),
    status: z.enum(["active", "paused", "finished"]),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .passthrough();

function toMe(u: { id: string; email: string; displayName: string; isAdmin: boolean; settings: string | null }): Me {
  return { id: u.id, email: u.email, displayName: u.displayName, isAdmin: u.isAdmin, settings: u.settings ? JSON.parse(u.settings) : null };
}

/* ---------------- auth ---------------- */
export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const [, auth] = await server();
  const u = auth.getSessionUser();
  return u ? toMe(u) : null;
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email, password, displayName }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const d = db.getDb();
    if (d.prepare("SELECT 1 FROM users WHERE email = ?").get(data.email)) return { error: "That email is already registered." };
    if (d.prepare("SELECT 1 FROM users WHERE display_name = ?").get(data.displayName)) return { error: "That player name is taken." };
    const id = crypto.randomUUID();
    db.tx((t) => {
      const first = !t.prepare("SELECT 1 FROM users LIMIT 1").get();
      t.prepare("INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
        id, data.email, data.displayName, auth.hashPassword(data.password), Date.now(),
      );
      t.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'user')").run(id);
      if (first) t.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'admin')").run(id);
    });
    auth.createSession(id);
    return { error: null };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email, password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const row = db.getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(data.email) as
      | { id: string; password_hash: string }
      | undefined;
    if (!row || !auth.verifyPassword(data.password, row.password_hash)) return { error: "Wrong email or password." };
    auth.createSession(row.id);
    return { error: null };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const [, auth] = await server();
  auth.destroySession();
  return { ok: true };
});

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ current: z.string().max(200), next: password }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const me = auth.requireUser();
    const row = db.getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(me.id) as { password_hash: string };
    if (!auth.verifyPassword(data.current, row.password_hash)) return { error: "Current password is wrong." };
    db.getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(auth.hashPassword(data.next), me.id);
    return { error: null };
  });

/* ---------------- app data ---------------- */
const parseGames = (rows: { data: string }[]) => rows.map((r) => JSON.parse(r.data) as Game);

export const loadState = createServerFn({ method: "GET" }).handler(async () => {
  const [db, auth] = await server();
  const me = auth.requireUser();
  const d = db.getDb();
  const players = (d.prepare("SELECT id, display_name, created_at FROM users ORDER BY display_name").all() as {
    id: string; display_name: string; created_at: number;
  }[]).map((u): Player => ({ id: u.id, name: u.display_name, createdAt: u.created_at }));
  const games = parseGames(
    d.prepare(
      `SELECT data FROM games WHERE owner_id = ?1
         OR id IN (SELECT game_id FROM game_players WHERE user_id = ?1)
       ORDER BY updated_at DESC`,
    ).all(me.id) as { data: string }[],
  );
  const statsGames = parseGames(d.prepare("SELECT data FROM games WHERE status = 'finished'").all() as { data: string }[]);
  return { me: toMe(me), players, games, statsGames };
});

export const saveGame = createServerFn({ method: "POST" })
  .inputValidator((d) => gameSchema.parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const me = auth.requireUser();
    return db.tx((t) => {
      const existing = t.prepare("SELECT owner_id FROM games WHERE id = ?").get(data.id) as { owner_id: string } | undefined;
      if (existing && existing.owner_id !== me.id && !me.isAdmin) throw new Error("Only the host can edit this game.");
      const userIds = data.playerIds.filter((id) => !isGuestId(id));
      for (const id of userIds) if (!t.prepare("SELECT 1 FROM users WHERE id = ?").get(id)) throw new Error("Unknown player.");
      const game = finalizeGame({ ...(data as unknown as Game), ownerId: existing?.owner_id ?? me.id, updatedAt: Date.now() });
      t.prepare(
        `INSERT INTO games (id, owner_id, status, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = excluded.updated_at`,
      ).run(game.id, game.ownerId!, game.status, JSON.stringify(game), game.createdAt, game.updatedAt);
      t.prepare("DELETE FROM game_players WHERE game_id = ?").run(game.id);
      game.playerIds.forEach((pid, seat) =>
        t.prepare("INSERT INTO game_players (game_id, seat, user_id, guest_name) VALUES (?, ?, ?, ?)").run(
          game.id, seat, isGuestId(pid) ? null : pid, isGuestId(pid) ? (game.guests?.[pid] ?? "Guest") : null,
        ),
      );
      return game;
    });
  });

export const deleteGame = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().max(64) }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const me = auth.requireUser();
    const row = db.getDb().prepare("SELECT owner_id FROM games WHERE id = ?").get(data.id) as { owner_id: string } | undefined;
    if (row && row.owner_id !== me.id && !me.isAdmin) throw new Error("Only the host can delete this game.");
    db.getDb().prepare("DELETE FROM games WHERE id = ?").run(data.id);
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.record(z.unknown()).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const me = auth.requireUser();
    db.getDb().prepare("UPDATE users SET settings = ? WHERE id = ?").run(JSON.stringify(data).slice(0, 10_000), me.id);
    return { ok: true };
  });

/* ---------------- move advisor ---------------- */
export const getAdvice = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        layoutId: z.string().max(64),
        dice: z.array(z.number().int().min(1).max(6)).min(1).max(6),
        rollsLeft: z.number().int().min(0).max(2),
        open: z.array(z.string().max(64)).max(40),
        upperSoFar: z.number().int().min(0).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const [, auth] = await server();
    auth.requireUser();
    const { LAYOUTS } = await import("@/yatzy/layouts");
    const { advise } = await import("@/yatzy/advisor");
    const layout = LAYOUTS.find((l) => l.id === data.layoutId);
    if (!layout) throw new Error("Unknown board layout.");
    if (data.dice.length !== layout.diceCount) throw new Error(`Enter ${layout.diceCount} dice.`);
    const open = data.open.filter((id) => layout.categories.some((c) => c.id === id));
    return advise(layout, data.dice, data.rollsLeft, open, data.upperSoFar);
  });

/* ---------------- admin ---------------- */
export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  const [db, auth] = await server();
  auth.requireAdmin();
  const d = db.getDb();
  const users = d.prepare(
    `SELECT u.id, u.email, u.display_name AS name, u.created_at AS createdAt,
            EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS isAdmin,
            (SELECT COUNT(*) FROM game_players gp WHERE gp.user_id = u.id) AS games
       FROM users u ORDER BY u.created_at`,
  ).all() as { id: string; email: string; name: string; createdAt: number; isAdmin: number; games: number }[];
  const games = d.prepare(
    `SELECT g.id, json_extract(g.data, '$.name') AS name, g.status, g.updated_at AS updatedAt, u.display_name AS owner
       FROM games g JOIN users u ON u.id = g.owner_id ORDER BY g.updated_at DESC LIMIT 200`,
  ).all() as { id: string; name: string; status: string; updatedAt: number; owner: string }[];
  return { users: users.map((u) => ({ ...u, isAdmin: !!u.isAdmin })), games };
});

const userIdInput = z.object({ userId: z.string().max(64) });

export const adminSetAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => userIdInput.extend({ admin: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    auth.requireAdmin();
    const d = db.getDb();
    if (data.admin) d.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'admin')").run(data.userId);
    else {
      const n = (d.prepare("SELECT COUNT(*) AS n FROM user_roles WHERE role = 'admin'").get() as { n: number }).n;
      if (n <= 1) return { error: "There must be at least one admin." };
      d.prepare("DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'").run(data.userId);
    }
    return { error: null };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d) => userIdInput.parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    const me = auth.requireAdmin();
    if (data.userId === me.id) return { error: "You can't delete your own account here." };
    db.getDb().prepare("DELETE FROM users WHERE id = ?").run(data.userId);
    return { error: null };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => userIdInput.extend({ password }).parse(d))
  .handler(async ({ data }) => {
    const [db, auth] = await server();
    auth.requireAdmin();
    const d = db.getDb();
    d.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(auth.hashPassword(data.password), data.userId);
    d.prepare("DELETE FROM sessions WHERE user_id = ?").run(data.userId);
    return { error: null };
  });
