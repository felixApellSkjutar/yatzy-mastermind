import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { getDb } from "./db.server";

const COOKIE = "yatzy_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  settings: string | null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pw, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

/** https (incl. behind a proxy) → SameSite=None;Secure so it also works inside embedded previews. */
function cookieOpts() {
  const req = getRequest();
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return {
    httpOnly: true,
    path: "/",
    sameSite: https ? ("none" as const) : ("lax" as const),
    secure: https,
    maxAge: SESSION_DAYS * 86400,
  };
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash(token), userId, Date.now() + SESSION_DAYS * 86400_000);
  setCookie(COOKIE, token, cookieOpts());
}

export function destroySession() {
  const token = getCookie(COOKIE);
  if (token) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(tokenHash(token));
  deleteCookie(COOKIE, cookieOpts());
}

export function getSessionUser(): SessionUser | null {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.settings, s.expires_at,
              EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS is_admin
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
    .get(tokenHash(token)) as
    | { id: string; email: string; display_name: string; settings: string | null; expires_at: number; is_admin: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, displayName: row.display_name, settings: row.settings, isAdmin: !!row.is_admin };
}

export function requireUser(): SessionUser {
  const u = getSessionUser();
  if (!u) throw new Error("Please sign in first.");
  return u;
}

export function requireAdmin(): SessionUser {
  const u = requireUser();
  if (!u.isAdmin) throw new Error("Admins only.");
  return u;
}
