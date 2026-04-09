# Phase 2: Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage with Supabase, add email/password authentication for a single admin user, and enforce Row Level Security so all data is locked to the authenticated user — ready to scale to multi-user without schema changes.

**Architecture:** Supabase Auth gates the entire app — unauthenticated users only see LoginPage. `AppContext.tsx` is updated to load data async from Supabase on mount and write mutations directly to Supabase tables. The domain hook interfaces (`useClients`, `useInvoices`, `useBills`, `useActivity`) are unchanged — components need no modification. `storage.ts` (localStorage) is deleted.

**Tech Stack:** React 19, TypeScript, Vite 7, @supabase/supabase-js, Supabase Auth, Supabase Postgres, Row Level Security

**Prerequisite:** Phase 1 must be complete and all tests passing.

---

### Task 1: Create Supabase tables and RLS policies

**Files:**
- No code files — run SQL in the Supabase dashboard

**User action required:** Log in to your Supabase dashboard at supabase.com, open your project, go to **SQL Editor**, and run the following SQL in order.

- [ ] **Step 1: Create the clients table**

```sql
create table clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,
  email        text not null default '',
  phone        text not null default '',
  address      text not null default '',
  city         text not null default '',
  country      text not null default '',
  company      text not null default '',
  created_at   timestamptz default now()
);

alter table clients enable row level security;

create policy "clients: select own"  on clients for select  using (auth.uid() = user_id);
create policy "clients: insert own"  on clients for insert  with check (auth.uid() = user_id);
create policy "clients: update own"  on clients for update  using (auth.uid() = user_id);
create policy "clients: delete own"  on clients for delete  using (auth.uid() = user_id);
```

- [ ] **Step 2: Create the invoices table**

```sql
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  client_id       uuid references clients(id) on delete set null,
  invoice_number  text not null,
  status          text not null default 'draft',
  issue_date      text not null default '',
  due_date        text not null default '',
  subtotal        numeric not null default 0,
  tax_rate        numeric not null default 0,
  tax_amount      numeric not null default 0,
  total           numeric not null default 0,
  notes           text not null default '',
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

alter table invoices enable row level security;

create policy "invoices: select own"  on invoices for select  using (auth.uid() = user_id);
create policy "invoices: insert own"  on invoices for insert  with check (auth.uid() = user_id);
create policy "invoices: update own"  on invoices for update  using (auth.uid() = user_id);
create policy "invoices: delete own"  on invoices for delete  using (auth.uid() = user_id);
```

- [ ] **Step 3: Create the invoice_line_items table**

```sql
create table invoice_line_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid references invoices(id) on delete cascade not null,
  description  text not null default '',
  quantity     numeric not null default 1,
  rate         numeric not null default 0,
  amount       numeric not null default 0
);

alter table invoice_line_items enable row level security;

create policy "line_items: select via invoice" on invoice_line_items
  for select using (
    exists (select 1 from invoices where invoices.id = invoice_line_items.invoice_id and invoices.user_id = auth.uid())
  );
create policy "line_items: insert via invoice" on invoice_line_items
  for insert with check (
    exists (select 1 from invoices where invoices.id = invoice_line_items.invoice_id and invoices.user_id = auth.uid())
  );
create policy "line_items: update via invoice" on invoice_line_items
  for update using (
    exists (select 1 from invoices where invoices.id = invoice_line_items.invoice_id and invoices.user_id = auth.uid())
  );
create policy "line_items: delete via invoice" on invoice_line_items
  for delete using (
    exists (select 1 from invoices where invoices.id = invoice_line_items.invoice_id and invoices.user_id = auth.uid())
  );
```

- [ ] **Step 4: Create the bills table**

```sql
create table bills (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  bill_number  text not null,
  vendor       text not null,
  category     text not null default 'Other',
  status       text not null default 'pending',
  issue_date   text not null default '',
  due_date     text not null default '',
  amount       numeric not null default 0,
  description  text not null default '',
  created_at   timestamptz default now()
);

alter table bills enable row level security;

create policy "bills: select own"  on bills for select  using (auth.uid() = user_id);
create policy "bills: insert own"  on bills for insert  with check (auth.uid() = user_id);
create policy "bills: update own"  on bills for update  using (auth.uid() = user_id);
create policy "bills: delete own"  on bills for delete  using (auth.uid() = user_id);
```

- [ ] **Step 5: Create the activity_log table**

```sql
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  description  text not null,
  type         text not null,
  date         timestamptz default now()
);

alter table activity_log enable row level security;

create policy "activity_log: select own"  on activity_log for select  using (auth.uid() = user_id);
create policy "activity_log: insert own"  on activity_log for insert  with check (auth.uid() = user_id);
create policy "activity_log: delete own"  on activity_log for delete  using (auth.uid() = user_id);
```

- [ ] **Step 6: Create the settings table**

```sql
create table settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null unique,
  data        jsonb not null default '{}',
  updated_at  timestamptz default now()
);

alter table settings enable row level security;

create policy "settings: select own"  on settings for select  using (auth.uid() = user_id);
create policy "settings: insert own"  on settings for insert  with check (auth.uid() = user_id);
create policy "settings: update own"  on settings for update  using (auth.uid() = user_id);
create policy "settings: upsert own"  on settings for all    using (auth.uid() = user_id);
```

- [ ] **Step 7: Create your admin user**

In Supabase dashboard → **Authentication** → **Users** → **Add user**. Enter your email and a strong password. Copy the UUID shown — you'll need it if you ever want to seed data directly.

---

### Task 2: Install Supabase SDK and configure environment

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env.local`
- Modify: `.gitignore`

**User action required:** In Supabase dashboard → **Project Settings** → **API**, copy your **Project URL** and **anon public** key.

- [ ] **Step 1: Install the Supabase client**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm install @supabase/supabase-js
```

Expected: `@supabase/supabase-js` added to dependencies.

- [ ] **Step 2: Create .env.local**

Create the file `/Users/ilir/Desktop/invoices app/.env.local` with your actual values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-id` and `your-anon-key-here` with the values from your Supabase dashboard.

- [ ] **Step 3: Ensure .env.local is gitignored**

Read `.gitignore`. If `.env.local` is not already listed, add it:

```bash
cd "/Users/ilir/Desktop/invoices app" && echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Verify .env.local is not tracked**

```bash
cd "/Users/ilir/Desktop/invoices app" && git status
```

Expected: `.env.local` does NOT appear in the output. If it does, run `git rm --cached .env.local` immediately.

- [ ] **Step 5: Commit the gitignore update only**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add .gitignore package.json package-lock.json && git commit -m "chore: install @supabase/supabase-js, update .gitignore"
```

---

### Task 3: Create src/lib/supabase.ts

**Files:**
- Create: `src/lib/supabase.ts`

A singleton Supabase client used throughout the app.

- [ ] **Step 1: Create src/lib/supabase.ts**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

Expected: app starts, no errors in the terminal about missing env vars.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/lib/supabase.ts && git commit -m "feat: add Supabase client singleton"
```

---

### Task 4: Create src/components/LoginPage.tsx

**Files:**
- Create: `src/components/LoginPage.tsx`

The only screen shown to unauthenticated users. No signup option.

- [ ] **Step 1: Create src/components/LoginPage.tsx**

```tsx
// src/components/LoginPage.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError("Invalid email or password.");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-500 mt-1">BizFlow Pro — Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/LoginPage.tsx && git commit -m "feat: add LoginPage with email/password auth"
```

---

### Task 5: Update src/main.tsx — auth session gate

**Files:**
- Modify: `src/main.tsx`

On load, check for an active Supabase session. Render `LoginPage` if unauthenticated, `App` (inside `AppProvider`) if authenticated. Subscribe to auth state changes so logout navigates back to login instantly.

- [ ] **Step 1: Read the file**

Read `src/main.tsx`.

- [ ] **Step 2: Replace src/main.tsx**

```tsx
// src/main.tsx
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AppProvider } from "./store/AppContext";
import App from "./App";
import LoginPage from "./components/LoginPage";
import "./index.css";

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return (
    <AppProvider userId={session.user.id}>
      <App />
    </AppProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/main.tsx && git commit -m "feat: gate app behind Supabase auth session"
```

---

### Task 6: Update AppContext.tsx — async Supabase data loading

**Files:**
- Modify: `src/store/AppContext.tsx`

Replace localStorage reads/writes with Supabase queries. `AppProvider` now accepts a `userId` prop (from the authenticated session). Data loads on mount via `useEffect`. Mutations write to Supabase directly and update React state optimistically.

- [ ] **Step 1: Read the file**

Read `src/store/AppContext.tsx`.

- [ ] **Step 2: Replace src/store/AppContext.tsx**

```typescript
// src/store/AppContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Client, Invoice, Bill, ActivityLog } from "@/types";

export interface AppStore {
  loading: boolean;
  clients: Client[];
  invoices: Invoice[];
  bills: Bill[];
  activityLog: ActivityLog[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  sendInvoice: (id: string) => Promise<void>;
  markInvoicePaid: (id: string) => Promise<void>;
  getNextInvoiceNumber: () => string;
  addBill: (bill: Omit<Bill, "id" | "createdAt">) => Promise<Bill>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  getNextBillNumber: () => string;
}

const AppContext = createContext<AppStore | null>(null);

// --- DB row → app type mappers ---

function toClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) ?? "",
    phone: (row.phone as string) ?? "",
    address: (row.address as string) ?? "",
    city: (row.city as string) ?? "",
    country: (row.country as string) ?? "",
    company: (row.company as string) ?? "",
    createdAt: row.created_at as string,
  };
}

function toInvoice(row: Record<string, unknown>, lineItems: Invoice["lineItems"]): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    clientId: (row.client_id as string) ?? "",
    status: row.status as Invoice["status"],
    issueDate: (row.issue_date as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    lineItems,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
    paidAt: row.paid_at as string | undefined,
  };
}

function toBill(row: Record<string, unknown>): Bill {
  return {
    id: row.id as string,
    billNumber: row.bill_number as string,
    vendor: row.vendor as string,
    category: row.category as string,
    status: row.status as Bill["status"],
    issueDate: (row.issue_date as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    amount: Number(row.amount),
    description: (row.description as string) ?? "",
    createdAt: row.created_at as string,
  };
}

function toActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: row.id as string,
    date: row.date as string,
    description: row.description as string,
    type: row.type as ActivityLog["type"],
  };
}

// --- Provider ---

export function AppProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);

  useEffect(() => {
    async function load() {
      const [clientsRes, invoicesRes, lineItemsRes, billsRes, activityRes] = await Promise.all([
        supabase.from("clients").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("invoices").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("invoice_line_items").select("*"),
        supabase.from("bills").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("activity_log").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(50),
      ]);

      const lineItemsByInvoice: Record<string, Invoice["lineItems"]> = {};
      for (const li of (lineItemsRes.data ?? [])) {
        const inv = li.invoice_id as string;
        if (!lineItemsByInvoice[inv]) lineItemsByInvoice[inv] = [];
        lineItemsByInvoice[inv].push({
          id: li.id as string,
          description: li.description as string,
          quantity: Number(li.quantity),
          rate: Number(li.rate),
          amount: Number(li.amount),
        });
      }

      setClients((clientsRes.data ?? []).map(toClient));
      setInvoices((invoicesRes.data ?? []).map((r) => toInvoice(r, lineItemsByInvoice[r.id as string] ?? [])));
      setBills((billsRes.data ?? []).map(toBill));
      setActivityLog((activityRes.data ?? []).map(toActivityLog));
      setLoading(false);
    }
    load();
  }, [userId]);

  const addActivityEntry = async (description: string, type: ActivityLog["type"]) => {
    const { data } = await supabase
      .from("activity_log")
      .insert({ user_id: userId, description, type })
      .select()
      .single();
    if (data) setActivityLog((prev) => [toActivityLog(data), ...prev]);
  };

  // --- Client mutations ---

  const addClient = async (client: Omit<Client, "id" | "createdAt">): Promise<Client> => {
    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: userId, name: client.name, email: client.email, phone: client.phone, address: client.address, city: client.city, country: client.country, company: client.company })
      .select()
      .single();
    if (error) throw error;
    const newClient = toClient(data);
    setClients((prev) => [...prev, newClient]);
    await addActivityEntry(`New client added: ${client.company || client.name}`, "client");
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<void> => {
    const { error } = await supabase.from("clients").update({
      ...(updates.name && { name: updates.name }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.phone !== undefined && { phone: updates.phone }),
      ...(updates.address !== undefined && { address: updates.address }),
      ...(updates.city !== undefined && { city: updates.city }),
      ...(updates.country !== undefined && { country: updates.country }),
      ...(updates.company !== undefined && { company: updates.company }),
    }).eq("id", id);
    if (error) throw error;
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await addActivityEntry(`Client updated: ${updates.company || updates.name || id}`, "client");
  };

  const deleteClient = async (id: string): Promise<void> => {
    const client = clients.find((c) => c.id === id);
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (client) await addActivityEntry(`Client deleted: ${client.company || client.name}`, "client");
  };

  // --- Invoice mutations ---

  const addInvoice = async (invoice: Omit<Invoice, "id" | "createdAt">): Promise<Invoice> => {
    const { data: invRow, error: invErr } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        client_id: invoice.clientId || null,
        invoice_number: invoice.invoiceNumber,
        status: invoice.status,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        subtotal: invoice.subtotal,
        tax_rate: invoice.taxRate,
        tax_amount: invoice.taxAmount,
        total: invoice.total,
        notes: invoice.notes,
        ...(invoice.paidAt ? { paid_at: invoice.paidAt } : {}),
      })
      .select()
      .single();
    if (invErr) throw invErr;

    const lineItemRows = invoice.lineItems.map((li) => ({
      invoice_id: invRow.id,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
    }));
    const { data: liData, error: liErr } = await supabase.from("invoice_line_items").insert(lineItemRows).select();
    if (liErr) throw liErr;

    const lineItems: Invoice["lineItems"] = (liData ?? []).map((li) => ({
      id: li.id as string,
      description: li.description as string,
      quantity: Number(li.quantity),
      rate: Number(li.rate),
      amount: Number(li.amount),
    }));

    const newInvoice = toInvoice(invRow, lineItems);
    setInvoices((prev) => [...prev, newInvoice]);
    const client = clients.find((c) => c.id === invoice.clientId);
    await addActivityEntry(`Invoice ${invoice.invoiceNumber} created for ${client?.company || client?.name || "Unknown"}`, "invoice");
    return newInvoice;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.issueDate !== undefined) dbUpdates.issue_date = updates.issueDate;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
    if (updates.taxAmount !== undefined) dbUpdates.tax_amount = updates.taxAmount;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.paidAt !== undefined) dbUpdates.paid_at = updates.paidAt;

    const { error } = await supabase.from("invoices").update(dbUpdates).eq("id", id);
    if (error) throw error;

    if (updates.lineItems) {
      await supabase.from("invoice_line_items").delete().eq("invoice_id", id);
      const rows = updates.lineItems.map((li) => ({ invoice_id: id, description: li.description, quantity: li.quantity, rate: li.rate, amount: li.amount }));
      await supabase.from("invoice_line_items").insert(rows);
    }

    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)));
  };

  const deleteInvoice = async (id: string): Promise<void> => {
    const inv = invoices.find((i) => i.id === id);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (inv) await addActivityEntry(`Invoice ${inv.invoiceNumber} deleted`, "invoice");
  };

  const sendInvoice = async (id: string): Promise<void> => {
    const inv = invoices.find((i) => i.id === id);
    const client = clients.find((c) => c.id === inv?.clientId);
    await updateInvoice(id, { status: "sent" });
    if (inv) await addActivityEntry(`Invoice ${inv.invoiceNumber} sent to ${client?.email || "client"}`, "invoice");
  };

  const markInvoicePaid = async (id: string): Promise<void> => {
    const inv = invoices.find((i) => i.id === id);
    const client = clients.find((c) => c.id === inv?.clientId);
    const paidAt = new Date().toISOString();
    await updateInvoice(id, { status: "paid", paidAt });
    if (inv) await addActivityEntry(`Payment received from ${client?.company || client?.name} — ${inv.total.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })}`, "payment");
  };

  const getNextInvoiceNumber = (): string => {
    const nums = invoices.map((i) => parseInt(i.invoiceNumber.replace("INV-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-${String(max + 1).padStart(3, "0")}`;
  };

  // --- Bill mutations ---

  const addBill = async (bill: Omit<Bill, "id" | "createdAt">): Promise<Bill> => {
    const { data, error } = await supabase
      .from("bills")
      .insert({ user_id: userId, bill_number: bill.billNumber, vendor: bill.vendor, category: bill.category, status: bill.status, issue_date: bill.issueDate, due_date: bill.dueDate, amount: bill.amount, description: bill.description })
      .select()
      .single();
    if (error) throw error;
    const newBill = toBill(data);
    setBills((prev) => [...prev, newBill]);
    await addActivityEntry(`Bill ${bill.billNumber} added from ${bill.vendor}`, "bill");
    return newBill;
  };

  const updateBill = async (id: string, updates: Partial<Bill>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.billNumber !== undefined) dbUpdates.bill_number = updates.billNumber;
    if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.issueDate !== undefined) dbUpdates.issue_date = updates.issueDate;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    const { error } = await supabase.from("bills").update(dbUpdates).eq("id", id);
    if (error) throw error;
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBill = async (id: string): Promise<void> => {
    const bill = bills.find((b) => b.id === id);
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) throw error;
    setBills((prev) => prev.filter((b) => b.id !== id));
    if (bill) await addActivityEntry(`Bill ${bill.billNumber} from ${bill.vendor} deleted`, "bill");
  };

  const getNextBillNumber = (): string => {
    const nums = bills.map((b) => parseInt(b.billNumber.replace("BILL-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `BILL-${String(max + 1).padStart(3, "0")}`;
  };

  const store: AppStore = {
    loading,
    clients, invoices, bills, activityLog,
    addClient, updateClient, deleteClient,
    addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid, getNextInvoiceNumber,
    addBill, updateBill, deleteBill, getNextBillNumber,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
```

- [ ] **Step 3: Update AppContext.test.tsx — skip Supabase tests**

The AppContext tests from Phase 1 test the localStorage version. Add a skip at the top since the tests now require a live Supabase connection:

```typescript
// src/store/AppContext.test.tsx
// NOTE: Integration tests for Supabase-backed AppContext require a live connection.
// Run these tests against a Supabase test project, not in CI.
import { describe, it } from "vitest";
describe.skip("useAppContext (Supabase — requires live connection)", () => {
  it("placeholder", () => {});
});
```

- [ ] **Step 4: Run tests to confirm format.ts tests still pass**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: format.ts tests pass, AppContext tests skipped.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/store/AppContext.tsx src/store/AppContext.test.tsx && git commit -m "feat: AppContext reads/writes Supabase instead of localStorage"
```

---

### Task 7: Update domain hooks — add loading passthrough

**Files:**
- Modify: `src/store/useClients.ts`
- Modify: `src/store/useInvoices.ts`
- Modify: `src/store/useBills.ts`
- Modify: `src/store/useActivity.ts`

The mutations are now async (`Promise<...>` return types). The domain hooks expose this automatically since they proxy `useAppContext`. The only addition is passing `loading` through so components can show a loading state.

- [ ] **Step 1: Update src/store/useClients.ts**

```typescript
// src/store/useClients.ts
import { useAppContext } from "./AppContext";

export function useClients() {
  const { loading, clients, addClient, updateClient, deleteClient } = useAppContext();
  return { loading, clients, addClient, updateClient, deleteClient };
}
```

- [ ] **Step 2: Update src/store/useInvoices.ts**

```typescript
// src/store/useInvoices.ts
import { useAppContext } from "./AppContext";

export function useInvoices() {
  const { loading, invoices, addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid, getNextInvoiceNumber } = useAppContext();
  return { loading, invoices, addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid, getNextInvoiceNumber };
}
```

- [ ] **Step 3: Update src/store/useBills.ts**

```typescript
// src/store/useBills.ts
import { useAppContext } from "./AppContext";

export function useBills() {
  const { loading, bills, addBill, updateBill, deleteBill, getNextBillNumber } = useAppContext();
  return { loading, bills, addBill, updateBill, deleteBill, getNextBillNumber };
}
```

- [ ] **Step 4: Update src/store/useActivity.ts**

```typescript
// src/store/useActivity.ts
import { useAppContext } from "./AppContext";

export function useActivity() {
  const { loading, activityLog } = useAppContext();
  return { loading, activityLog };
}
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/store/useClients.ts src/store/useInvoices.ts src/store/useBills.ts src/store/useActivity.ts && git commit -m "feat: domain hooks expose loading state from Supabase"
```

---

### Task 8: Update Settings.tsx — Supabase settings table

**Files:**
- Modify: `src/components/Settings.tsx`

Replace the localStorage save/load with Supabase `settings` table. Settings are stored as a JSONB blob (one row per user). On load, read from Supabase; on save, upsert.

- [ ] **Step 1: Read the file**

Read `src/components/Settings.tsx`.

- [ ] **Step 2: Replace loadSettings and handleSave**

At the top of `Settings.tsx`, add the Supabase import:

```typescript
import { supabase } from "@/lib/supabase";
```

Remove `const STORAGE_KEY = 'bizflow_settings';` and the `function loadSettings()` definition.

Replace the `Settings` function with:

```tsx
export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("settings").select("data").eq("user_id", user.id).single();
      if (data?.data) setSettings({ ...defaultSettings, ...data.data });
      setLoading(false);
    }
    load();
  }, []);

  const update = (key: keyof BusinessSettings, value: string | number) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("settings").upsert({ user_id: user.id, data: settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return <div className="p-6 text-gray-400 text-sm">Loading settings…</div>;
  }

  // ... rest of JSX unchanged
```

Update `InvoiceView.tsx` to also read from Supabase. Replace the `loadPaymentDetails` function in `InvoiceView.tsx`:

```typescript
// In InvoiceView.tsx — replace loadPaymentDetails with a useEffect
const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});

useEffect(() => {
  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("settings").select("data").eq("user_id", user.id).single();
    if (data?.data) setPaymentSettings(data.data);
  }
  load();
}, []);
```

Also add `import { supabase } from "@/lib/supabase";` to `InvoiceView.tsx` and replace `settings` references with `paymentSettings`, and `hasPaymentDetails` with:

```typescript
const hasPaymentDetails = paymentSettings.bankName || paymentSettings.accountNumber || paymentSettings.sortCode;
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Settings.tsx src/components/InvoiceView.tsx && git commit -m "feat: Settings and InvoiceView read/write Supabase settings table"
```

---

### Task 9: Add logout to Sidebar.tsx

**Files:**
- Modify: `src/components/Sidebar.tsx`

Add a logout button that calls `supabase.auth.signOut()`. The session listener in `main.tsx` will immediately unmount the app and show `LoginPage`.

- [ ] **Step 1: Read the file**

Read `src/components/Sidebar.tsx`.

- [ ] **Step 2: Add logout to Sidebar**

At the top of `Sidebar.tsx`, add:

```typescript
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
```

Inside the `Sidebar` component, add before the closing `</nav>` or at the bottom of the sidebar:

```tsx
<button
  onClick={() => supabase.auth.signOut()}
  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full mt-auto"
>
  <LogOut className="w-4 h-4" />
  <span>Sign out</span>
</button>
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Sidebar.tsx && git commit -m "feat: add logout button to Sidebar"
```

---

### Task 10: Final end-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

- [ ] **Step 2: Verify login flow**

Open the app in the browser. Confirm `LoginPage` appears. Enter incorrect credentials — verify the error message shows. Enter your correct Supabase credentials — confirm the app loads.

- [ ] **Step 3: Verify data persistence**

Create a new client. Refresh the page. Confirm the client is still there (loaded from Supabase, not localStorage).

Create a new invoice for that client. View it. Confirm payment details appear if set in Settings.

- [ ] **Step 4: Verify each page loads**

Walk through: Dashboard, Invoices, Bills, Clients, Reports, Settings. All should load data from Supabase.

- [ ] **Step 5: Verify logout**

Click Sign out in the Sidebar. Confirm the app returns to LoginPage.

- [ ] **Step 6: Run tests**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: format.ts tests pass, AppContext tests skipped.

- [ ] **Step 7: Build for production**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: build succeeds. The output is a single `dist/index.html` (via `vite-plugin-singlefile`).

- [ ] **Step 8: Delete src/store/storage.ts if it exists**

```bash
cd "/Users/ilir/Desktop/invoices app" && [ -f src/store/storage.ts ] && rm src/store/storage.ts || echo "already gone"
```

- [ ] **Step 9: Final commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add -A && git commit -m "feat: Phase 2 complete — full Supabase integration with auth and RLS"
```

---

*Phase 2 complete. The app is now backed by Supabase with email/password authentication, Row Level Security on every table, and a single admin user. Multi-user support requires only adding more Supabase Auth users — no schema changes needed.*
