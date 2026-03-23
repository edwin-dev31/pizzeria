# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Generate prod environment file (uses __PLACEHOLDER__ syntax for runtime replacement)
RUN node scripts/generate-env.mjs
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/dist/pizzeria-platform/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
