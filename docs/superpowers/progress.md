# Implementation Progress

## Status: Phase 1 COMPLETE ✓ — Ready to execute Phase 2

## What's been done (planning)
- Full codebase analysis via jCodemunch (repo: local/invoices app-e64fdfe4)
- Dead code, complexity, and unstable module audit completed
- Brainstorming session completed, architecture decided
- Design spec written and committed: `docs/superpowers/specs/2026-04-09-invoices-app-refactor-supabase-design.md`
- CLAUDE.md created at project root
- Memory saved to ~/.claude/projects/...

## Architecture decisions locked in
- Store-direct (Option B): components call domain hooks directly, no prop-drilling
- AppContext (React Context) replaces useStore.ts — single shared state, domain hooks are thin wrappers
- App.tsx = layout + routing only (modal state: invoiceId string, not full invoice object)
- formatCurrency → src/utils/format.ts (single shared copy)
- Payment details (bankName, accountName, accountNumber, sortCode, iban) added to BusinessSettings
- Payment details rendered at bottom of every InvoiceView
- Supabase Auth: email/password, single admin, NO in-app signup
- RLS on every Supabase table (user_id = auth.uid())
- Settings stored as JSONB blob in Supabase settings table

## Plans saved
- Phase 1: `docs/superpowers/plans/2026-04-09-phase1-refactor.md` (15 tasks)
- Phase 2: `docs/superpowers/plans/2026-04-09-phase2-supabase.md` (10 tasks)

## Phase 1 task list (ALL COMPLETE — 2026-04-09)
1. Set up Vitest ✓
2. Create src/utils/format.ts
3. Create src/store/AppContext.tsx (replaces useStore.ts)
4. Create domain hooks: useClients, useInvoices, useBills, useActivity
5. Update src/main.tsx (wrap with AppProvider)
6. Update src/App.tsx (layout/routing only, modal uses invoiceId not full Invoice)
7. Update Dashboard.tsx (use domain hooks)
8. Update InvoiceList.tsx (store-direct, InvoiceRow sub-component)
9. Update InvoiceForm.tsx (store-direct, takes invoiceId prop)
10. Update InvoiceView.tsx (store-direct, takes invoiceId prop, shows payment details)
11. Update ClientList.tsx (store-direct, ClientRow + ClientFormModal sub-components)
12. Update BillList.tsx (store-direct)
13. Update Reports.tsx (store-direct)
14. Update Settings.tsx (payment details fields)
15. Delete src/store/useStore.ts, final verification

## Phase 2 task list (after Phase 1 complete) ← START HERE
1. Create Supabase tables + RLS (SQL — USER ACTION NEEDED)
2. Install @supabase/supabase-js, create .env.local (USER ACTION NEEDED for credentials)
3. Create src/lib/supabase.ts
4. Create src/components/LoginPage.tsx
5. Update src/main.tsx (auth session gate)
6. Update AppContext.tsx (async Supabase queries)
7. Update domain hooks (expose loading state)
8. Update Settings.tsx + InvoiceView.tsx (Supabase settings table)
9. Add logout to Sidebar.tsx
10. Final end-to-end verification

## Key file interfaces (locked — don't change)
- InvoiceForm props: { invoiceId?: string; onClose: () => void }
- InvoiceView props: { invoiceId: string; onClose: () => void }
- InvoiceList props: { onAdd: () => void; onEdit: (id: string) => void; onView: (id: string) => void }
- ClientList props: none (fully self-contained)
- BillList props: none (fully self-contained)
- Dashboard props: { onNavigate: (page: string) => void; onAddInvoice: () => void }
- Reports props: none (fully self-contained)

## Modal type in App.tsx
```typescript
type Modal =
  | { type: "invoice-form"; invoiceId?: string }
  | { type: "invoice-view"; invoiceId: string }
  | null;
```

## Tech stack
React 19, TypeScript, Vite 7, Tailwind CSS, Vitest (to be added), @supabase/supabase-js (Phase 2)
Repo ID: local/invoices app-e64fdfe4
