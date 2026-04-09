# Invoices — Ilir Hoti Web Design

A private invoicing and business management tool built for freelance web design work. Replaces spreadsheets and generic invoicing platforms with something purpose-built.

---

## What it does

Running a freelance web design business means keeping track of clients, chasing payments, and knowing at a glance where you stand financially. Most invoicing tools are either too bloated or too basic. This one does exactly what's needed and nothing else.

- **Dashboard** — live snapshot of outstanding, overdue, and collected revenue with charts
- **Invoices** — create, send, and mark invoices as paid; track status from draft to collected
- **Bills** — log outgoing expenses to keep income and costs in one place
- **Clients** — store client contact and address details
- **Reports** — monthly revenue, expense trends, and invoice breakdowns
- **Settings** — business details used to populate invoice PDFs

---

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (auth + database)

---

## Running locally

```bash
# Install dependencies
npm install

# Add your Supabase credentials
cp .env.example .env.local
# then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start the dev server
npm run dev
```

---

## Notes

- Admin access only — no public signup. The account is created directly via the Supabase dashboard.
- All data is stored in Supabase with row-level security; only the authenticated user can read or write their own records.

---

© Ilir Hoti Web Design
