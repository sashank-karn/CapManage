# CapManage Backend

TypeScript Express API implementing authentication, role-based access control, and module-specific endpoints derived from the Excel requirements.

## Getting started

```bash
npm install
npm run dev
```

The API listens on port `5000` by default.

### CORS and frontend origin

The API enables CORS with credentials for the frontend origin.

- Set `FRONTEND_BASE_URL` (default: `http://localhost:3000`).
- To allow multiple origins in development (e.g., `127.0.0.1` or Vite), set `CORS_ALLOWED_ORIGINS` to a comma-separated list, for example:

```
CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:5173
```

If you see a "Network Error" from the frontend during login, it's usually a CORS misconfiguration or wrong `NEXT_PUBLIC_API_BASE_URL`. Ensure:

- Frontend `NEXT_PUBLIC_API_BASE_URL` points to this API, e.g. `http://localhost:5000/api/v1`.
- The browser origin (e.g., `http://localhost:3000`) is included via `FRONTEND_BASE_URL` or `CORS_ALLOWED_ORIGINS`.

## Available scripts

- `npm run dev` &mdash; start the development server with hot reload.
- `npm run build` &mdash; compile TypeScript into `dist/`.
- `npm run start` &mdash; run the compiled server (production).
- `npm run lint` &mdash; lint the codebase via ESLint.
- `npm run format` &mdash; format code using Prettier.
- `npm run test` &mdash; execute Jest unit/integration tests.
- `npm run seed` &mdash; parse the Excel workbook and seed MongoDB in an idempotent way.

Check `src/config/env.ts` for the list of required environment variables.
