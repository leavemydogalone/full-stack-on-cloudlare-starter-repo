# Full Stack on Cloudflare — Starter Repo

Opinionated starter monorepo demonstrating a full-stack Cloudflare Workers application:

- Frontend: React + Vite app served as a Cloudflare Worker (`apps/user-application`).
- Backend: Cloudflare Workers-based data/service layer with Durable Objects and scheduled workflows (`apps/data-service`).
- Shared libs: TypeScript utilities and DB helpers in `packages/data-ops` used by both apps.

This repo is set up with pnpm workspaces and Cloudflare Wrangler for local development and deployment.

**Feature Overview**

This project demonstrates a full-stack, Cloudflare Workers-based application focused on link tracking, automated destination evaluation, and analytics. Key user-facing and system capabilities include:

- Link click capture: records link clicks from users in real time and persists click events for analytics and geo-visualization.
- Geo & activity visualizations: dashboards that show active links, regions, and area-level activity using map visualizations and tables (see `apps/user-application/src/components/dashboard`).
- Destination evaluation: automated workflows that evaluate destinations (webpages) using headless rendering plus AI checks to flag problematic or unsafe targets. Evaluations run on a schedule and on-demand (see `apps/data-service/src/workflows` and `helpers/ai-destination-checker.ts`).
- Problematic links detection: identifies and surfaces links with bad or suspicious content via evaluation pipelines and presents them in `problematic-links-table`.
- Durable objects for state and scheduling: uses Durable Objects to coordinate geo-aggregated click data, scheduled evaluation runs, and queue-handling for asynchronous tasks (`apps/data-service/src/durable-objects`).
- Queue-driven processing: link-click events are enqueued and processed by worker handlers so the frontend experience stays fast while heavy evaluation work runs asynchronously (`queue-handlers/link-clicks.ts`).
- Real-time updates: socket connections push live activity to the frontend to show near-real-time link click spikes and updates (`apps/user-application/src/hooks/clicks-socket.ts`).
- Auth & billing integration: optional auth components and Stripe integration hooks are present for user identity and billing flows (`apps/user-application/src/components/auth`, `@better-auth/stripe` in dependencies).
- Shared data layer: `packages/data-ops` contains typed DB helpers, Drizzle/Kysely schema and migrations, and durable-object helper utilities used throughout the monorepo.

Conceptually, the system is split into:

- Frontend (`apps/user-application`): React + Vite UI for monitoring, managing links, and viewing evaluation results.
- Backend/Workers (`apps/data-service`): Hono-based Workers that accept events, run workflows, use Durable Objects for coordination, and call AI/renderer helpers to evaluate external destinations.
- Shared packages (`packages/data-ops`): database schema, queries, migrations, and reusable helpers.

## Architecture Overview

- Frontend: React + Vite, uses `@repo/data-ops` for types/queries and communicates with the data-service via tRPC/Open API endpoints.
- Data/service: Hono-based Cloudflare Worker with durable objects, scheduled evaluation workflows, and queue handlers.
- Data layer: `packages/data-ops` contains Drizzle/Kysely helpers, migrations, and typed exports used across the monorepo.

**Quick links**

- Frontend app: `apps/user-application`
- Data/service worker: `apps/data-service`
- Shared utilities: `packages/data-ops`

## Requirements

- Node.js (LTS) and `pnpm` installed globally.
- A Cloudflare account and API token for Wrangler deployments.
- `wrangler` CLI (used via workspace scripts or installed globally).

## Setup

1. Clone the repo and install dependencies (from repository root):

```bash
pnpm install --recursive
```

2. Environment and bindings

- Per-environment config and secrets are managed via Wrangler and environment-specific files. Check the `wrangler.jsonc` files in `apps/*` for bindings and environment hints.

## Development

- Start the frontend (Vite):

```bash
pnpm run dev-frontend
```

- Start the data/service worker locally (Wrangler):

```bash
pnpm run dev-data-service
```

These root scripts proxy into workspace packages:

- `dev-frontend` → `apps/user-application` (`vite --port 3000`)
- `dev-data-service` → `apps/data-service` (`wrangler dev`)

````

## Build

- Build the shared package used by other workspaces:

```bash
pnpm run build-package
````

- Build the frontend (production):

```bash
pnpm --filter user-application run build
```

## Deploy

- The apps are intended to be deployed as Cloudflare Workers using Wrangler.
- Example: deploy the data service to the `stage` environment:

```bash
pnpm --filter data-service run stage:deploy
```

- For the frontend, use the `stage:deploy` script in `apps/user-application` or manually run `wrangler deploy` from that package.

Be sure your Cloudflare credentials and account details are configured for `wrangler` (see the Wrangler docs).

## Useful files

- `pnpm-workspace.yaml` — workspace configuration
- `wrangler.jsonc` in each app — Cloudflare Worker configuration and bindings
- `service-bindings.d.ts` — TypeScript bindings for Worker environments

## License

This project is provided under the repository license. See `LICENSE` at the repo root
