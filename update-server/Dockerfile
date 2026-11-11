FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install --production
COPY . .

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app ./

EXPOSE 4000

CMD ["npx", "tsx", "src/server.ts"]
