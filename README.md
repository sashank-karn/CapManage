# CapManage Monorepo

CapManage is a full-stack monorepo that implements authentication, role-based workflows and module-specific features derived directly from the provided Excel requirements. The project is composed of a TypeScript Express backend and a Next.js (App Router) frontend styled with Tailwind CSS.

## Project structure

```
project-root/
├── backend/
├── frontend/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
└── README.md
```

Refer to `backend/README.md` and `frontend/README.md` (coming soon) for service-specific documentation. Key tasks:

- Copy `.env.example` to `.env` and adjust secrets.
- Run `npm install` from the repo root to bootstrap both workspaces.
- Execute `npm run dev` to start frontend (3000) and backend (5000) concurrently.
- Seed the database with `npm run seed` before using protected routes.

This README will be expanded after the initial scaffolding to describe deployment, testing, and module coverage.


scripts should be removedd........
