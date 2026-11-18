FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json postcss.config.js tailwind.config.js ./
COPY shared ./shared
COPY server ./server
COPY client ./client

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY shared ./shared
COPY server ./server

EXPOSE 3000

CMD ["npm", "start"]
