# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# If environment files were pre-generated (CI), use them as-is.
# Otherwise generate them now (local docker build with .env present).
RUN if [ ! -f src/environments/environment.ts ]; then node scripts/generate-env.mjs; fi
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/dist/pizzeria-platform/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
