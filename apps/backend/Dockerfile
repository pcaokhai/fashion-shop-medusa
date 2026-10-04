# Build context = repo root:  docker build -f apps/backend/Dockerfile -t vck-backend .
# One image runs the server (admin included) and the worker; MEDUSA_WORKER_MODE picks the role.
# ponytail: full workspace deps are kept in the final image (medusa exec needs ts-node/swc for seed + setup scripts),
# so it is big; slim it with `.medusa/server` + `pnpm install --prod` if image size ever matters.
FROM node:22-bookworm-slim
ENV NODE_ENV=production CI=true FILE_UPLOAD_DIR=/app/apps/backend/static
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
COPY packages packages
COPY tools tools
RUN pnpm install --frozen-lockfile --prod=false --filter @vck/backend...
COPY apps/backend apps/backend
COPY contracts contracts
WORKDIR /app/apps/backend
RUN pnpm build
EXPOSE 9000
# the built server (with the admin bundle) is under .medusa/server; scripts run from the project root via `medusa exec`
CMD ["sh", "-c", "cd .medusa/server && npx medusa start"]
