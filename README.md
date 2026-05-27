This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend (Elysia) and Database

This repository includes a small Elysia backend in the `backend/` folder and PostgreSQL helpers in `database/`.

1. Copy `.env.example` to `.env` and fill in your database credentials.
2. Install dependencies with Bun and generate Prisma client:

```bash
# install deps
bun install

# generate prisma client
bun run prisma generate
```

3. From the `my-app` folder run the apps separately:

```bash
# Start Next.js app
bun run dev

# In another terminal: start backend
bun run dev:backend
```

The backend will perform a quick DB health-check on startup and log connection status.

Project layout (simplified):

- `app/` — Next.js app routes and pages
- `src/server/` — Elysia backend entry (`index.ts`)
- `src/lib/prisma.ts` — Prisma client (backend DB access)
- `backend/`, `database/` — small shims kept for backward compatibility
