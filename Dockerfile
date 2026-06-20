# 三合一管理系统 Dockerfile
# 基于 Node.js 22 Alpine，构建 Next.js 生产环境

FROM node:22-alpine AS base
WORKDIR /app

# 安装依赖阶段
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

# 构建阶段
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.mjs ./server.mjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用自定义服务器以支持 WebSocket
CMD ["node", "server.mjs"]
