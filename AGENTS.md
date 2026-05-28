# AGENTS.md

## Purpose
This file orients agentic coding tools working in this repository.
It summarizes commands, conventions, and coding style based on the
current codebase.

## Project Overview
- Next.js app (pages router) for a personal blog.
- TypeScript enabled with strict compiler settings.
- Tailwind CSS for styling; global styles in CSS.
- API routes under `pages/api` with shared request handlers in `lib`.
- No explicit test framework configured.

## Commands
### Install
- `npm install`

### Development
- `npm run dev` (Next dev server)
- `npm run start` (production server, after build)

### Build
- `npm run build` (Next build)

### Lint
- `npm run lint` (Next.js ESLint)

### Test
- No test runner configured in `package.json`.
- If adding tests, also add scripts for running full suite and single tests.

### Scripts (Content/DB)
- `npm run rss` (generate RSS feed)
- `npm run import` (import posts)
- `npm run create-post` (create new post)
- `npm run connect-db` (connect to DB)

### Running a Single Test
- Not available yet; no test runner.
- If you introduce tests, prefer a command like:
  - `npm test -- <file>` or `npm run test -- <pattern>`
  - Document it here when added.

## Lint/Typecheck Notes
- ESLint config: `eslint.config.mjs` uses `@eslint/js`, `@next/eslint-plugin-next`,
  and `typescript-eslint` recommended configs.
- No separate Prettier config present.
- TypeScript strict mode enabled; keep types accurate and explicit where needed.

## Code Style Guidelines
### Formatting
- Prefer 2-space indentation.
- Use trailing commas where the project already uses them in multiline objects.
- Follow existing file conventions (some files use single quotes, others double).
  - Keep the style consistent within each file.
- Use semicolons (existing code does).

### Imports
- Group imports by source type:
  1) External libraries
  2) Internal modules (lib, components)
  3) Relative local files
- Keep import paths explicit and stable; avoid index-barrel churn.
- Use `import type` for types where it improves clarity.

### Types and Interfaces
- Prefer `interface` for object shapes and component props.
- Use `type` aliases for unions and complex compositions.
- Keep API response types in `types/api` (see usage in request handlers).
- Use strict null checks; explicitly handle `undefined`/`null`.

### Naming Conventions
- Components: `PascalCase` filenames and exported component names.
- Functions: `camelCase`.
- Constants: `camelCase` for local, `UPPER_SNAKE_CASE` only for env-like values.
- API handlers: `handleX` naming (e.g., `handlePost`, `handlePut`).

### React/Next.js
- Pages live under `pages/` and use default exports for components.
- API routes in `pages/api`, typically delegating to lib request handlers.
- Use `next-themes` theme provider in `_app.tsx`.
- Keep components pure and lean; pass data via props.

### Styling
- Tailwind utility classes for layout and UI.
- Global CSS lives in `styles/globals.css`.
- Avoid inline styles unless necessary.
- Follow existing class naming patterns for responsive layouts.

### Error Handling
- Prefer centralized error responses using `pages/api/errorHandler.ts`.
- In API routes:
  - Validate input early, return structured responses.
  - In non-production, surface real error messages (existing behavior).
- For DB operations, handle missing records and validation errors explicitly.

### Data/Database Access
- DB access via `database/db.mjs` and SQL tagged template literals.
- Always sanitize inputs with parameterized queries (current pattern already does).
- Keep request validation in handler helpers (see `isRequestValid`).

### Markdown and Content
- Markdown parsed via unified/remark/rehype pipeline in `lib/markdown-parser.ts`.
- Maintain the existing pipeline ordering when modifying it.

## Repository Structure
- `pages/`: Next.js pages and API routes.
- `components/`: UI components.
- `lib/`: shared logic, content utilities, request handlers.
- `styles/`: global CSS.
- `scripts/`: CLI utilities for content and DB operations.
- `public/`: static assets.

## Cursor/Copilot Rules
- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.
- If such rules are added, update this file to mirror them.

## Practical Guidance for Agents
- Respect existing code style in each file; minimize unrelated refactors.
- Avoid adding new dependencies unless necessary.
- Keep changes small and focused; avoid formatting-only churn.
- When touching API routes, update both handler and response types if needed.
- When adding scripts, document them in `package.json` and in this file.

## Change Safety
- Do not remove or alter content scripts unless explicitly requested.
- Validate user-facing changes locally (lint/build) when asked.

## Tips for Adding Tests (If Needed)
- Choose a test runner (e.g., Vitest or Jest) and update scripts.
- Add `npm run test` and `npm run test:watch`.
- Document single-test usage here when added.
