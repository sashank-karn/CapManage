# CapManage Backend

TypeScript Express API implementing authentication, role-based access control, and module-specific endpoints derived from the Excel requirements.

## Getting started

```bash
npm install
npm run dev
```

The API listens on port `5000` by default.

## Available scripts

- `npm run dev` &mdash; start the development server with hot reload.
- `npm run build` &mdash; compile TypeScript into `dist/`.
- `npm run start` &mdash; run the compiled server (production).
- `npm run lint` &mdash; lint the codebase via ESLint.
- `npm run format` &mdash; format code using Prettier.
- `npm run test` &mdash; execute Jest unit/integration tests.
- `npm run seed` &mdash; parse the Excel workbook and seed MongoDB in an idempotent way.

Check `src/config/env.ts` for the list of required environment variables.
