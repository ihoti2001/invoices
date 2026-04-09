# Invoices App — Refactor + Supabase Design

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

Two sequential phases to clean up the codebase and add secure persistent storage with authentication.

- **Phase 1** — Local refactor: fix dead code, split the store, reduce complexity, simplify App.tsx
- **Phase 2** — Supabase: add email/password login, migrate data to Supabase tables with RLS

Each phase is independently deployable. Phase 2 does not change component interfaces — only the persistence layer inside the store hooks.

---

## Phase 1: Refactor

### Goals

- Eliminate 41 dead symbols (handlers defined but never connected)
- Split the god-store (`useStore.ts`, cyclomatic 29) into focused domain hooks
- Extract duplicated `formatCurrency` into a single shared utility
- Reduce component nesting depth from 9 to ≤4
- Simplify `App.tsx` from instability score 0.92 (11 dependencies) to layout/routing only

### Store Split

`src/store/useStore.ts` is deleted and replaced with:

| File | Responsibility |
|---|---|
| `src/store/useClients.ts` | Add, update, delete clients + activity logging |
| `src/store/useInvoices.ts` | Add, update, delete, send, mark paid invoices + activity logging |
| `src/store/useBills.ts` | Add, update, delete bills + activity logging |
| `src/store/useActivity.ts` | Activity log reads |
| `src/store/storage.ts` | Shared `loadData` / `saveData` (localStorage in Phase 1, replaced in Phase 2) |

Each hook reads and writes its own slice of the shared `AppData` structure via `storage.ts`. In Phase 2, only `storage.ts` is replaced — hook interfaces stay identical.

### Dead Handler Cleanup

All 7 handlers in `App.tsx` (`handleAddNew`, `handleEditInvoice`, `handleViewInvoice`, `handleSaveInvoice`, `handleSendFromView`, `handleMarkPaidFromView`, `getModalInvoiceClient`) are removed from App. Each component calls its domain hook directly for mutations (Option B: store-direct architecture).

App.tsx retains only:
- Page routing state (`useState<Page>`)
- Modal state (`useState<Modal>`)
- Layout rendering (Sidebar + page switcher)

### Shared Utilities

`formatCurrency` is extracted to `src/utils/format.ts` and imported by all components. The 5 duplicate copies in `BillList`, `ClientList`, `Dashboard`, `InvoiceList`, and `Reports` are removed.

`src/utils/cn.ts` (currently dead) is kept — it will be used once components are cleaned up.

### Component Complexity Reduction

`ClientList` (326 lines, nesting depth 9) and `InvoiceList` (153 lines, nesting depth 9) have their deeply nested JSX extracted into named sub-components within the same file:

- `ClientList.tsx` → adds `ClientRow`, `ClientFormModal` sub-components
- `InvoiceList.tsx` → adds `InvoiceRow` sub-component

No new files. Target nesting depth ≤4.

### File Structure After Phase 1

```
src/
  components/
    AddNewMenu.tsx
    BillList.tsx
    ClientList.tsx       ← flattened, ClientRow + ClientFormModal sub-components
    Dashboard.tsx
    InvoiceForm.tsx
    InvoiceList.tsx      ← flattened, InvoiceRow sub-component
    InvoiceView.tsx
    Reports.tsx
    Settings.tsx
    Sidebar.tsx
  store/
    useActivity.ts       ← new
    useBills.ts          ← new
    useClients.ts        ← new
    useInvoices.ts       ← new
    storage.ts           ← new (extracted from useStore.ts)
  types/
    index.ts             ← unchanged
  utils/
    cn.ts                ← unchanged
    format.ts            ← new (shared formatCurrency)
  App.tsx                ← routing + layout only
  main.tsx               ← unchanged
  index.css              ← unchanged
```

---

## Phase 2: Supabase

### Goals

- Secure email/password login for single admin user
- All data persisted in Supabase (no more localStorage)
- Row Level Security on every table — data locked to authenticated user
- Architecture ready for multi-user with no schema changes

### Authentication

- Supabase Auth with email/password provider
- Admin account created once via Supabase dashboard — no in-app signup screen
- `LoginPage` component shown to unauthenticated users — no other route is accessible
- On login, Supabase issues a session token persisted in the browser (survives page refresh)
- Logout button added to `Sidebar` — ends session, redirects to `LoginPage`
- Supabase session listener in `main.tsx` controls which root component renders

### Database Schema

All tables include a `user_id` column (`uuid`, references `auth.users`) for RLS and future multi-user support.

**`clients`**
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references auth.users not null
name        text not null
email       text
phone       text
address     text
city        text
company     text
notes       text
created_at  timestamptz default now()
```

**`invoices`**
```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references auth.users not null
client_id       uuid references clients(id)
invoice_number  text not null
status          text not null  -- draft | sent | paid | overdue | cancelled
total           numeric not null
due_date        date
notes           text
paid_at         timestamptz
created_at      timestamptz default now()
```

**`invoice_line_items`**
```sql
id          uuid primary key default gen_random_uuid()
invoice_id  uuid references invoices(id) on delete cascade
description text not null
quantity    numeric not null
rate        numeric not null
amount      numeric not null
```

**`bills`**
```sql
id           uuid primary key default gen_random_uuid()
user_id      uuid references auth.users not null
vendor       text not null
bill_number  text not null
status       text not null  -- pending | paid | overdue
amount       numeric not null
due_date     date
notes        text
paid_at      timestamptz
created_at   timestamptz default now()
```

**`activity_log`**
```sql
id           uuid primary key default gen_random_uuid()
user_id      uuid references auth.users not null
description  text not null
type         text not null  -- invoice | client | bill | payment
date         timestamptz default now()
```

### Row Level Security

Every table gets these two policies (example for `clients`, repeated for all tables):

```sql
-- Users can only read their own rows
create policy "select own" on clients
  for select using (auth.uid() = user_id);

-- Users can only insert rows for themselves
create policy "insert own" on clients
  for insert with check (auth.uid() = user_id);

-- Users can only update their own rows
create policy "update own" on clients
  for update using (auth.uid() = user_id);

-- Users can only delete their own rows
create policy "delete own" on clients
  for delete using (auth.uid() = user_id);
```

### Storage Layer Swap

`src/store/storage.ts` is an interim file used only in Phase 1 — it wraps localStorage and is the single place `loadData`/`saveData` live. In Phase 2, `storage.ts` is deleted entirely. Each domain hook (`useClients`, `useInvoices`, `useBills`) is updated to make direct Supabase queries via `src/lib/supabase.ts`. Component code does not change — only the internals of the store hooks change.

### Environment Variables

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

Stored in `.env.local` at project root. `.env.local` is added to `.gitignore` — never committed.

### New Files in Phase 2

```
src/
  lib/
    supabase.ts          ← Supabase client singleton
  components/
    LoginPage.tsx        ← email/password login form
```

---

## Security Decisions

| Decision | Rationale |
|---|---|
| No in-app signup | Only admin should have access. Account created in Supabase dashboard. |
| RLS on every table | Data is safe even if API key is exposed. Mandatory for any future multi-user work. |
| Anon key only | The Supabase anon key is safe to ship in frontend code when RLS is enabled. Service role key never leaves the server. |
| `.env.local` not committed | Keeps credentials out of git history. |
| Session persistence | Browser stores session token — admin stays logged in across refreshes without re-entering credentials. |

---

## Out of Scope

- Email sending (invoices sent via email)
- PDF export
- Multi-user / team accounts (foundation is laid, not implemented)
- Offline support
