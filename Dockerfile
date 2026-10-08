FROM node:22-slim AS build
WORKDIR /app
COPY package*.json bun.lock* ./
RUN npm install
COPY . .
RUN NITRO_PRESET=node-server npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production PORT=3000 DATABASE_FILE=/data/yatzy.db
VOLUME /data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
