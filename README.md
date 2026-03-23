# Jiro's Pizza — Pizzeria Platform

Angular 17 SPA for a multi-branch pizzeria. Customers browse the menu, select products with size variants, and send orders via WhatsApp. Admins manage products, sections, branches and theme from a protected panel.

---

## Stack

- Angular 17 (standalone components, signals)
- Supabase (Postgres + Auth)
- Cloudinary (product image uploads)
- Nginx (production serving)
- Docker + GitHub Actions (CI/CD)

---

## Getting started

### 1. Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- A [Cloudinary](https://cloudinary.com) account (optional, for image uploads)

### 2. Environment setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary → Dashboard |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary → Settings → Upload |

### 3. Generate environment files

```bash
npm run env:generate
```

This reads `.env` and writes `src/environments/environment.ts` (dev) and `src/environments/environment.prod.ts` (prod with `__PLACEHOLDERS__` for runtime injection). These files are git-ignored and must be generated before every build.

### 4. Run database migrations

Apply migrations from `supabase/migrations/` via the Supabase dashboard or CLI.

### 5. Seed data

```bash
npm run seed
```

Inserts branches, menu sections, products, variants and assigns admin roles.

### 6. Start dev server

```bash
npm start
```

App runs at `http://localhost:4200`.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Generate env + start dev server |
| `npm run build` | Generate env + production build |
| `npm run env:generate` | Generate environment files from `.env` |
| `npm run seed` | Seed database from `model.json` |
| `npm run docker:up` | Build and run with Docker Compose |
| `npm run docker:down` | Stop containers |

---

## Docker

### Local

```bash
npm run docker:up
```

App available at `http://localhost:8080`. Environment variables are injected at container startup via `scripts/entrypoint.sh`, which replaces `__PLACEHOLDERS__` in the built JS files.

### Environment variables at runtime

Pass variables via `docker-compose.yml` or directly:

```bash
docker run -p 8080:80 \
  -e SUPABASE_URL=... \
  -e SUPABASE_ANON_KEY=... \
  your-dockerhub-username/pizzeria-platform:latest
```

---

## CI/CD

The GitHub Actions workflow (`.github/workflows/docker-build-push.yml`) triggers on merge to `main` or manually via `workflow_dispatch`:

1. Generates environment files using GitHub secrets
2. Builds a multi-arch image (`linux/amd64`, `linux/arm64`)
3. Pushes to Docker Hub with `:latest` and `:<git-sha>` tags

### Required GitHub secrets

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload preset |

---

## Project structure

```
pizza-project/
├── src/
│   ├── app/
│   │   ├── admin/          # Admin panel (login, products, sections, theme)
│   │   ├── core/           # Guards, models, services
│   │   ├── public/         # Branch selector, menu page, cart, modals
│   │   └── shared/         # Pipes, shared components
│   ├── environments/       # Generated — do not commit
│   └── styles/             # Global SCSS, variables, mixins
├── scripts/
│   ├── generate-env.mjs    # Generates environment files from .env
│   ├── entrypoint.sh       # Docker runtime placeholder replacement
│   └── seed.ts             # Database seeder
├── supabase/
│   └── migrations/         # SQL migration files
├── model.json              # Source of truth for seed data
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Admin panel

Route: `/admin` — credentials are configured during the seed step.
