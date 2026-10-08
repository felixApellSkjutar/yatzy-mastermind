# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Self-hosting (no cloud needed)

Yatzy.Tray stores everything in one local SQLite file (Node 22.13+ built-in `node:sqlite`). Accounts, sessions and roles are handled by the app itself.

**Run with Docker (home server / Raspberry Pi):**

```sh
docker compose up -d --build   # http://<your-machine>:3000
```

Data lives in `./data/yatzy.db`. Back up by copying that file.

**Run directly with Node:**

```sh
npm install
NITRO_PRESET=node-server npm run build
DATABASE_FILE=./data/yatzy.db PORT=3000 node .output/server/index.mjs
```

The first account that signs up becomes the admin (`/admin`). Admins can reset passwords, manage roles, and delete players or games. Put it behind HTTPS (e.g. Caddy) if you open it to the internet.
