# Invoices App — Claude Instructions

## Code Navigation
Always use jCodemunch MCP tools for code exploration. Repo ID: `local/invoices app-e64fdfe4`.
Start every session with `resolve_repo { "path": "." }` to confirm the index is current.

## Project Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (Phase 2) — auth + database

## Architecture Decisions
- **Store-direct**: components call domain hooks (`useClients`, `useInvoices`, `useBills`) directly — no prop-drilling store actions through App
- **App.tsx** is layout and routing only — no business logic
- **Formatting utilities** live in `src/utils/format.ts` — never duplicated in components

## Key Files
- `src/store/` — domain hooks, one file per domain
- `src/types/index.ts` — all shared types, single source of truth
- `src/utils/format.ts` — shared formatCurrency and other formatters
- `src/lib/supabase.ts` — Supabase client singleton (Phase 2)
- `.env.local` — Supabase credentials (never commit this file)

## Design Spec
Full design at `docs/superpowers/specs/2026-04-09-invoices-app-refactor-supabase-design.md`.
-Use impeccable plugin for UI elements during the design process.


## Code Style
- Functional components only, no class components
- Sub-components within the same file are fine for small helpers (e.g. `ClientRow` inside `ClientList.tsx`)
- Target cyclomatic complexity ≤10 per function
- Target JSX nesting depth ≤4

## Security Rules
- Never commit `.env.local`
- Never use the Supabase service role key in frontend code — anon key only
- All Supabase tables must have RLS enabled with `user_id = auth.uid()` policies
- No in-app signup screen — admin account is created via Supabase dashboard only
