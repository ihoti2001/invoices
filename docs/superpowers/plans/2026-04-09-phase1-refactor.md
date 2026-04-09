# Phase 1: Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up dead code, split the god-store into domain hooks via React Context, extract shared utilities, simplify App.tsx to layout/routing only, flatten deep component nesting, and add payment details to Settings.

**Architecture:** React Context (`AppContext`) holds shared `AppData` state and all mutations, replacing `useStore.ts`. Thin domain hooks (`useClients`, `useInvoices`, `useBills`, `useActivity`) read from that context. Components call domain hooks directly — no prop-drilling of store data or mutations. App.tsx only owns modal state and page routing.

**Tech Stack:** React 19, TypeScript, Vite 7, Vitest, @testing-library/react, Tailwind CSS

---

### Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install test dependencies**

```bash
cd "/Users/ilir/Desktop/invoices app"
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: packages added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Add test script to package.json**

Replace the `"scripts"` block in `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 3: Add Vitest config to vite.config.ts**

```typescript
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Create test setup file**

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Verify Vitest runs**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: `No test files found` (zero tests, zero failures — that's correct at this stage).

- [ ] **Step 6: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add package.json vite.config.ts src/test/setup.ts && git commit -m "chore: set up Vitest testing infrastructure"
```

---

### Task 2: Create src/utils/format.ts

**Files:**
- Create: `src/utils/format.ts`
- Create: `src/utils/format.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/format.test.ts
import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats whole numbers with 2 decimal places", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });
  it("formats decimal amounts", () => {
    expect(formatCurrency(7590.5)).toBe("$7,590.50");
  });
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: FAIL — `Cannot find module './format'`

- [ ] **Step 3: Create src/utils/format.ts**

```typescript
// src/utils/format.ts
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/utils/format.ts src/utils/format.test.ts && git commit -m "feat: extract shared formatCurrency utility"
```

---

### Task 3: Create src/store/AppContext.tsx

**Files:**
- Create: `src/store/AppContext.tsx`
- Create: `src/store/AppContext.test.tsx`

This file replaces `useStore.ts`. It holds all shared app state and mutations in a React Context.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/store/AppContext.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider, useAppContext } from "./AppContext";
import { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

beforeEach(() => {
  localStorage.clear();
});

describe("useAppContext", () => {
  it("throws when used outside AppProvider", () => {
    expect(() => renderHook(() => useAppContext())).toThrow(
      "useAppContext must be used within AppProvider"
    );
  });

  it("provides default clients", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.clients.length).toBeGreaterThan(0);
  });

  it("addClient adds a client and returns it", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    let newClient: ReturnType<typeof result.current.addClient>;
    act(() => {
      newClient = result.current.addClient({
        name: "Test User",
        email: "test@example.com",
        phone: "555-0000",
        address: "1 Test St",
        city: "London",
        country: "UK",
        company: "Test Co",
      });
    });
    expect(newClient!.id).toBeDefined();
    expect(result.current.clients.find((c) => c.id === newClient!.id)).toBeTruthy();
  });

  it("deleteClient removes the client", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const id = result.current.clients[0].id;
    act(() => { result.current.deleteClient(id); });
    expect(result.current.clients.find((c) => c.id === id)).toBeUndefined();
  });

  it("getNextInvoiceNumber returns INV-006 when 5 invoices exist", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.getNextInvoiceNumber()).toBe("INV-006");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: FAIL — `Cannot find module './AppContext'`

- [ ] **Step 3: Create src/store/AppContext.tsx**

```typescript
// src/store/AppContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Client, Invoice, Bill, ActivityLog } from "@/types";

const STORAGE_KEY = "billingapp_data";

interface AppData {
  clients: Client[];
  invoices: Invoice[];
  bills: Bill[];
  activityLog: ActivityLog[];
}

const defaultData: AppData = {
  clients: [
    { id: "c1", name: "John Smith", email: "john@acmecorp.com", phone: "+1 555-0101", address: "123 Business Ave", city: "New York", country: "USA", company: "Acme Corporation", createdAt: "2026-01-05T10:00:00Z" },
    { id: "c2", name: "Sarah Johnson", email: "sarah@techstart.io", phone: "+1 555-0202", address: "456 Tech Street", city: "San Francisco", country: "USA", company: "TechStart Inc.", createdAt: "2026-01-10T10:00:00Z" },
    { id: "c3", name: "Michael Brown", email: "michael@globalventures.com", phone: "+1 555-0303", address: "789 Commerce Blvd", city: "Chicago", country: "USA", company: "Global Ventures LLC", createdAt: "2026-02-01T10:00:00Z" },
    { id: "c4", name: "Emily Davis", email: "emily@brightdesign.co", phone: "+1 555-0404", address: "321 Creative Lane", city: "Austin", country: "USA", company: "Bright Design Co.", createdAt: "2026-02-15T10:00:00Z" },
  ],
  invoices: [
    { id: "inv1", invoiceNumber: "INV-001", clientId: "c1", status: "paid", issueDate: "2026-01-15", dueDate: "2026-02-15", lineItems: [{ id: "li1", description: "Web Development Services", quantity: 40, rate: 125, amount: 5000 }, { id: "li2", description: "UI/UX Design", quantity: 20, rate: 95, amount: 1900 }], subtotal: 6900, taxRate: 10, taxAmount: 690, total: 7590, notes: "Thank you for your business!", createdAt: "2026-01-15T10:00:00Z", paidAt: "2026-02-10T10:00:00Z" },
    { id: "inv2", invoiceNumber: "INV-002", clientId: "c2", status: "paid", issueDate: "2026-02-01", dueDate: "2026-03-01", lineItems: [{ id: "li3", description: "SEO Consulting", quantity: 10, rate: 200, amount: 2000 }, { id: "li4", description: "Content Strategy", quantity: 5, rate: 150, amount: 750 }], subtotal: 2750, taxRate: 10, taxAmount: 275, total: 3025, notes: "Payment due within 30 days.", createdAt: "2026-02-01T10:00:00Z", paidAt: "2026-02-25T10:00:00Z" },
    { id: "inv3", invoiceNumber: "INV-003", clientId: "c3", status: "overdue", issueDate: "2026-02-15", dueDate: "2026-03-15", lineItems: [{ id: "li5", description: "Mobile App Development", quantity: 60, rate: 150, amount: 9000 }], subtotal: 9000, taxRate: 10, taxAmount: 900, total: 9900, notes: "", createdAt: "2026-02-15T10:00:00Z" },
    { id: "inv4", invoiceNumber: "INV-004", clientId: "c4", status: "sent", issueDate: "2026-03-01", dueDate: "2026-04-01", lineItems: [{ id: "li6", description: "Brand Identity Design", quantity: 1, rate: 3500, amount: 3500 }, { id: "li7", description: "Logo Design", quantity: 1, rate: 800, amount: 800 }], subtotal: 4300, taxRate: 10, taxAmount: 430, total: 4730, notes: "Includes 2 revision rounds.", createdAt: "2026-03-01T10:00:00Z" },
    { id: "inv5", invoiceNumber: "INV-005", clientId: "c1", status: "draft", issueDate: "2026-03-20", dueDate: "2026-04-20", lineItems: [{ id: "li8", description: "Maintenance & Support", quantity: 1, rate: 2000, amount: 2000 }], subtotal: 2000, taxRate: 10, taxAmount: 200, total: 2200, notes: "Monthly retainer.", createdAt: "2026-03-20T10:00:00Z" },
  ],
  bills: [
    { id: "b1", billNumber: "BILL-001", vendor: "AWS", category: "Cloud Services", status: "paid", issueDate: "2026-01-01", dueDate: "2026-01-31", amount: 450, description: "Monthly cloud hosting", createdAt: "2026-01-01T10:00:00Z" },
    { id: "b2", billNumber: "BILL-002", vendor: "Adobe", category: "Software", status: "paid", issueDate: "2026-02-01", dueDate: "2026-02-28", amount: 120, description: "Creative Cloud subscription", createdAt: "2026-02-01T10:00:00Z" },
    { id: "b3", billNumber: "BILL-003", vendor: "Office Rent", category: "Office", status: "pending", issueDate: "2026-03-01", dueDate: "2026-04-01", amount: 2500, description: "Monthly office rent", createdAt: "2026-03-01T10:00:00Z" },
    { id: "b4", billNumber: "BILL-004", vendor: "Slack", category: "Software", status: "overdue", issueDate: "2026-02-15", dueDate: "2026-03-15", amount: 80, description: "Team communication tool", createdAt: "2026-02-15T10:00:00Z" },
  ],
  activityLog: [
    { id: "a1", date: "2026-03-20T10:00:00Z", description: "Invoice INV-005 created as draft for Acme Corporation", type: "invoice" },
    { id: "a2", date: "2026-03-05T10:00:00Z", description: "Invoice INV-004 sent to Bright Design Co.", type: "invoice" },
    { id: "a3", date: "2026-03-01T10:00:00Z", description: "Invoice INV-004 created for Bright Design Co.", type: "invoice" },
    { id: "a4", date: "2026-02-25T10:00:00Z", description: "Payment received from TechStart Inc. — $3,025.00", type: "payment" },
    { id: "a5", date: "2026-02-15T10:00:00Z", description: "Invoice INV-003 created for Global Ventures LLC", type: "invoice" },
    { id: "a6", date: "2026-02-10T10:00:00Z", description: "Payment received from Acme Corporation — $7,590.00", type: "payment" },
    { id: "a7", date: "2026-02-01T10:00:00Z", description: "Invoice INV-002 created for TechStart Inc.", type: "invoice" },
    { id: "a8", date: "2026-01-15T10:00:00Z", description: "Invoice INV-001 created for Acme Corporation", type: "invoice" },
  ],
};

function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultData;
}

function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export interface AppStore {
  clients: Client[];
  invoices: Invoice[];
  bills: Bill[];
  activityLog: ActivityLog[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  sendInvoice: (id: string) => void;
  markInvoicePaid: (id: string) => void;
  getNextInvoiceNumber: () => string;
  addBill: (bill: Omit<Bill, "id" | "createdAt">) => Bill;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  getNextBillNumber: () => string;
}

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => { saveData(data); }, [data]);

  const addActivity = (description: string, type: ActivityLog["type"]) => {
    const log: ActivityLog = { id: crypto.randomUUID(), date: new Date().toISOString(), description, type };
    setData((prev) => ({ ...prev, activityLog: [log, ...prev.activityLog] }));
  };

  const addClient = (client: Omit<Client, "id" | "createdAt">): Client => {
    const newClient: Client = { ...client, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, clients: [...prev.clients, newClient] }));
    addActivity(`New client added: ${client.company || client.name}`, "client");
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setData((prev) => ({ ...prev, clients: prev.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
    addActivity(`Client updated: ${updates.company || updates.name || id}`, "client");
  };

  const deleteClient = (id: string) => {
    const client = data.clients.find((c) => c.id === id);
    setData((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
    if (client) addActivity(`Client deleted: ${client.company || client.name}`, "client");
  };

  const addInvoice = (invoice: Omit<Invoice, "id" | "createdAt">): Invoice => {
    const newInvoice: Invoice = { ...invoice, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const client = data.clients.find((c) => c.id === invoice.clientId);
    setData((prev) => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
    addActivity(`Invoice ${invoice.invoiceNumber} created for ${client?.company || client?.name || "Unknown"}`, "invoice");
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setData((prev) => ({ ...prev, invoices: prev.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)) }));
  };

  const deleteInvoice = (id: string) => {
    const inv = data.invoices.find((i) => i.id === id);
    setData((prev) => ({ ...prev, invoices: prev.invoices.filter((i) => i.id !== id) }));
    if (inv) addActivity(`Invoice ${inv.invoiceNumber} deleted`, "invoice");
  };

  const sendInvoice = (id: string) => {
    const inv = data.invoices.find((i) => i.id === id);
    const client = data.clients.find((c) => c.id === inv?.clientId);
    updateInvoice(id, { status: "sent" });
    if (inv) addActivity(`Invoice ${inv.invoiceNumber} sent to ${client?.email || "client"}`, "invoice");
  };

  const markInvoicePaid = (id: string) => {
    const inv = data.invoices.find((i) => i.id === id);
    const client = data.clients.find((c) => c.id === inv?.clientId);
    updateInvoice(id, { status: "paid", paidAt: new Date().toISOString() });
    if (inv) addActivity(`Payment received from ${client?.company || client?.name} — ${inv.total.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })}`, "payment");
  };

  const getNextInvoiceNumber = (): string => {
    const nums = data.invoices.map((i) => parseInt(i.invoiceNumber.replace("INV-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-${String(max + 1).padStart(3, "0")}`;
  };

  const addBill = (bill: Omit<Bill, "id" | "createdAt">): Bill => {
    const newBill: Bill = { ...bill, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, bills: [...prev.bills, newBill] }));
    addActivity(`Bill ${bill.billNumber} added from ${bill.vendor}`, "bill");
    return newBill;
  };

  const updateBill = (id: string, updates: Partial<Bill>) => {
    setData((prev) => ({ ...prev, bills: prev.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
  };

  const deleteBill = (id: string) => {
    const bill = data.bills.find((b) => b.id === id);
    setData((prev) => ({ ...prev, bills: prev.bills.filter((b) => b.id !== id) }));
    if (bill) addActivity(`Bill ${bill.billNumber} from ${bill.vendor} deleted`, "bill");
  };

  const getNextBillNumber = (): string => {
    const nums = data.bills.map((b) => parseInt(b.billNumber.replace("BILL-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `BILL-${String(max + 1).padStart(3, "0")}`;
  };

  const store: AppStore = {
    clients: data.clients,
    invoices: data.invoices,
    bills: data.bills,
    activityLog: data.activityLog,
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: All AppContext tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/store/AppContext.tsx src/store/AppContext.test.tsx && git commit -m "feat: create AppContext replacing useStore"
```

---

### Task 4: Create domain hooks

**Files:**
- Create: `src/store/useClients.ts`
- Create: `src/store/useInvoices.ts`
- Create: `src/store/useBills.ts`
- Create: `src/store/useActivity.ts`

These are thin wrappers over `useAppContext` — they give components a clean, domain-scoped interface.

- [ ] **Step 1: Create src/store/useClients.ts**

```typescript
// src/store/useClients.ts
import { useAppContext } from "./AppContext";

export function useClients() {
  const { clients, addClient, updateClient, deleteClient } = useAppContext();
  return { clients, addClient, updateClient, deleteClient };
}
```

- [ ] **Step 2: Create src/store/useInvoices.ts**

```typescript
// src/store/useInvoices.ts
import { useAppContext } from "./AppContext";

export function useInvoices() {
  const {
    invoices,
    addInvoice, updateInvoice, deleteInvoice,
    sendInvoice, markInvoicePaid, getNextInvoiceNumber,
  } = useAppContext();
  return {
    invoices,
    addInvoice, updateInvoice, deleteInvoice,
    sendInvoice, markInvoicePaid, getNextInvoiceNumber,
  };
}
```

- [ ] **Step 3: Create src/store/useBills.ts**

```typescript
// src/store/useBills.ts
import { useAppContext } from "./AppContext";

export function useBills() {
  const { bills, addBill, updateBill, deleteBill, getNextBillNumber } = useAppContext();
  return { bills, addBill, updateBill, deleteBill, getNextBillNumber };
}
```

- [ ] **Step 4: Create src/store/useActivity.ts**

```typescript
// src/store/useActivity.ts
import { useAppContext } from "./AppContext";

export function useActivity() {
  const { activityLog } = useAppContext();
  return { activityLog };
}
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/store/useClients.ts src/store/useInvoices.ts src/store/useBills.ts src/store/useActivity.ts && git commit -m "feat: add domain hooks (useClients, useInvoices, useBills, useActivity)"
```

---

### Task 5: Update src/main.tsx — wrap app with AppProvider

**Files:**
- Modify: `src/main.tsx`
- Read first: `src/main.tsx`

- [ ] **Step 1: Read the file**

Read `src/main.tsx` to see its current content.

- [ ] **Step 2: Update src/main.tsx**

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store/AppContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/main.tsx && git commit -m "feat: wrap app in AppProvider"
```

---

### Task 6: Update src/App.tsx — strip to layout and routing only

**Files:**
- Modify: `src/App.tsx`

App no longer imports `useStore`. It only manages: which page is visible, and which modal is open (invoice-form or invoice-view, identified by `invoiceId`).

- [ ] **Step 1: Read the file**

Read `src/App.tsx`.

- [ ] **Step 2: Replace src/App.tsx**

```tsx
// src/App.tsx
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import InvoiceList from "./components/InvoiceList";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceView from "./components/InvoiceView";
import BillList from "./components/BillList";
import ClientList from "./components/ClientList";
import Reports from "./components/Reports";
import Settings from "./components/Settings";

type Page = "dashboard" | "invoices" | "bills" | "clients" | "reports" | "settings";

type Modal =
  | { type: "invoice-form"; invoiceId?: string }
  | { type: "invoice-view"; invoiceId: string }
  | null;

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [modal, setModal] = useState<Modal>(null);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar currentPage={page} onNavigate={(p) => setPage(p as Page)} />

      <main className="flex-1 overflow-auto">
        {page === "dashboard" && (
          <Dashboard
            onNavigate={(p) => setPage(p as Page)}
            onAddInvoice={() => setModal({ type: "invoice-form" })}
          />
        )}
        {page === "invoices" && (
          <InvoiceList
            onAdd={() => setModal({ type: "invoice-form" })}
            onEdit={(id) => setModal({ type: "invoice-form", invoiceId: id })}
            onView={(id) => setModal({ type: "invoice-view", invoiceId: id })}
          />
        )}
        {page === "bills" && <BillList />}
        {page === "clients" && <ClientList />}
        {page === "reports" && <Reports />}
        {page === "settings" && <Settings />}
      </main>

      {modal?.type === "invoice-form" && (
        <InvoiceForm
          invoiceId={modal.invoiceId}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "invoice-view" && (
        <InvoiceView
          invoiceId={modal.invoiceId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/App.tsx && git commit -m "refactor: simplify App.tsx to layout and routing only"
```

---

### Task 7: Update Dashboard.tsx — use domain hooks

**Files:**
- Modify: `src/components/Dashboard.tsx`

Dashboard gets its data from `useClients`, `useInvoices`, `useBills`, `useActivity`. Props reduce to just `onNavigate` and `onAddInvoice`.

- [ ] **Step 1: Read the file**

Read `src/components/Dashboard.tsx`.

- [ ] **Step 2: Replace the imports and props section**

At the top of `Dashboard.tsx`, replace the import block and the `DashboardProps` interface with:

```tsx
import { useClients } from "@/store/useClients";
import { useInvoices } from "@/store/useInvoices";
import { useBills } from "@/store/useBills";
import { useActivity } from "@/store/useActivity";
import { formatCurrency } from "@/utils/format";
// keep all existing lucide-react and other imports
```

Replace the `DashboardProps` interface and function signature:

```tsx
interface DashboardProps {
  onNavigate: (page: string) => void;
  onAddInvoice: () => void;
}

function Dashboard({ onNavigate, onAddInvoice }: DashboardProps) {
  const { clients } = useClients();
  const { invoices } = useInvoices();
  const { bills } = useBills();
  const { activityLog } = useActivity();
  // rest of function body stays the same — replace onAddNew with onAddInvoice
```

- [ ] **Step 3: Remove local formatCurrency and FileTextIcon definitions**

Delete the `function formatCurrency(amount: number)` definition (around line 22) and the `function FileTextIcon()` definition (around line 258) from `Dashboard.tsx`. Both are now handled by the import.

- [ ] **Step 4: Replace onAddNew with onAddInvoice in JSX**

Search for `onAddNew` in `Dashboard.tsx` and replace all occurrences with `onAddInvoice`.

- [ ] **Step 5: Run the dev server and verify Dashboard renders**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

Open the browser, navigate to the Dashboard page. Confirm stats, activity log, and charts render correctly.

- [ ] **Step 6: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Dashboard.tsx && git commit -m "refactor: Dashboard uses domain hooks directly"
```

---

### Task 8: Update InvoiceList.tsx — store-direct + extract InvoiceRow

**Files:**
- Modify: `src/components/InvoiceList.tsx`

InvoiceList fetches its own data via `useInvoices` and `useClients`. It only needs three props from App: `onAdd`, `onEdit`, `onView` (modal triggers that carry an invoice ID). An `InvoiceRow` sub-component flattens the nesting.

- [ ] **Step 1: Read the file**

Read `src/components/InvoiceList.tsx`.

- [ ] **Step 2: Replace InvoiceList.tsx**

```tsx
// src/components/InvoiceList.tsx
import { useState } from "react";
import { Plus, Eye, Edit, Trash2, Send, CheckCircle } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { formatCurrency } from "@/utils/format";
import { Invoice, Client } from "@/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-50 text-red-400",
};

interface InvoiceListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

interface InvoiceRowProps {
  invoice: Invoice;
  client: Client | undefined;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onSend: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  confirmDelete: string | null;
}

function InvoiceRow({ invoice, client, onEdit, onView, onSend, onMarkPaid, onDelete, confirmDelete }: InvoiceRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {invoice.invoiceNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {client?.company || client?.name || "—"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {invoice.dueDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatCurrency(invoice.total)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status] || "bg-gray-100 text-gray-600"}`}>
          {invoice.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onView(invoice.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="View">
            <Eye className="w-4 h-4" />
          </button>
          {invoice.status === "draft" && (
            <button onClick={() => onEdit(invoice.id)} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Edit">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button onClick={() => onSend(invoice.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Send">
              <Send className="w-4 h-4" />
            </button>
          )}
          {invoice.status === "sent" && (
            <button onClick={() => onMarkPaid(invoice.id)} className="p-1 text-gray-400 hover:text-green-600 rounded" title="Mark Paid">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(invoice.id)}
            className={`p-1 rounded ${confirmDelete === invoice.id ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-red-600"}`}
            title={confirmDelete === invoice.id ? "Click again to confirm" : "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function InvoiceList({ onAdd, onEdit, onView }: InvoiceListProps) {
  const { invoices, sendInvoice, markInvoicePaid, deleteInvoice } = useInvoices();
  const { clients } = useClients();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteInvoice(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Invoice #", "Client", "Due Date", "Amount", "Status", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider last:text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  client={clients.find((c) => c.id === invoice.clientId)}
                  onEdit={onEdit}
                  onView={onView}
                  onSend={sendInvoice}
                  onMarkPaid={markInvoicePaid}
                  onDelete={handleDelete}
                  confirmDelete={confirmDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

Navigate to Invoices page. Confirm list renders, filter tabs work, delete confirm works.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/InvoiceList.tsx && git commit -m "refactor: InvoiceList uses domain hooks, extract InvoiceRow sub-component"
```

---

### Task 9: Update InvoiceForm.tsx — store-direct

**Files:**
- Modify: `src/components/InvoiceForm.tsx`

InvoiceForm now takes `invoiceId?: string` and `onClose`. It looks up the invoice from `useInvoices` (if editing) and calls mutations directly.

- [ ] **Step 1: Read the file**

Read `src/components/InvoiceForm.tsx`.

- [ ] **Step 2: Replace InvoiceForm.tsx**

```tsx
// src/components/InvoiceForm.tsx
import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { LineItem, Invoice } from "@/types";

interface InvoiceFormProps {
  invoiceId?: string;
  onClose: () => void;
}

function calcTotals(lineItems: LineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export default function InvoiceForm({ invoiceId, onClose }: InvoiceFormProps) {
  const { invoices, addInvoice, updateInvoice, getNextInvoiceNumber } = useInvoices();
  const { clients } = useClients();

  const invoice = invoiceId ? invoices.find((i) => i.id === invoiceId) : undefined;

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? getNextInvoiceNumber());
  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [status, setStatus] = useState<Invoice["status"]>(invoice?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 10);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems ?? [{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, amount: 0 }]
  );

  const { subtotal, taxAmount, total } = calcTotals(lineItems, taxRate);

  const addLineItem = () =>
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, amount: 0 }]);

  const removeLineItem = (id: string) =>
    setLineItems((prev) => prev.filter((li) => li.id !== id));

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = Number(updated.quantity) * Number(updated.rate);
        }
        return updated;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      invoiceNumber, clientId, status, issueDate, dueDate,
      lineItems, subtotal, taxRate, taxAmount, total, notes,
      ...(invoice?.paidAt ? { paidAt: invoice.paidAt } : {}),
    };
    if (invoice) {
      updateInvoice(invoice.id, payload);
    } else {
      addInvoice(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{invoice ? "Edit Invoice" : "New Invoice"}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(li.id, "description", e.target.value)} className="col-span-5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" placeholder="Qty" value={li.quantity} onChange={(e) => updateLineItem(li.id, "quantity", Number(e.target.value))} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" placeholder="Rate" value={li.rate} onChange={(e) => updateLineItem(li.id, "rate", Number(e.target.value))} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="col-span-2 text-sm text-gray-700 text-right">${li.amount.toFixed(2)}</div>
                  <button type="button" onClick={() => removeLineItem(li.id)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Tax</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs text-right" />
                  <span className="text-xs">%</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {invoice ? "Update Invoice" : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open Invoices page → click New Invoice. Fill in details and save. Edit an existing invoice. Both should work.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/InvoiceForm.tsx && git commit -m "refactor: InvoiceForm uses domain hooks directly"
```

---

### Task 10: Update InvoiceView.tsx — store-direct + show payment details

**Files:**
- Modify: `src/components/InvoiceView.tsx`

InvoiceView receives `invoiceId` and `onClose`. It looks up the live invoice and client from hooks and reads payment details from Settings storage.

- [ ] **Step 1: Read the file**

Read `src/components/InvoiceView.tsx`.

- [ ] **Step 2: Replace InvoiceView.tsx**

```tsx
// src/components/InvoiceView.tsx
import { useState } from "react";
import { X, Printer, Send, CheckCircle } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { formatCurrency } from "@/utils/format";

const SETTINGS_KEY = "bizflow_settings";

function loadPaymentDetails() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-50 text-red-400",
};

interface InvoiceViewProps {
  invoiceId: string;
  onClose: () => void;
}

export default function InvoiceView({ invoiceId, onClose }: InvoiceViewProps) {
  const { invoices, sendInvoice, markInvoicePaid } = useInvoices();
  const { clients } = useClients();
  const [showSendModal, setShowSendModal] = useState(false);
  const [sent, setSent] = useState(false);

  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = invoice ? clients.find((c) => c.id === invoice.clientId) : undefined;
  const settings = loadPaymentDetails();

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-500">Invoice not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  const handleSendInvoice = () => {
    sendInvoice(invoice.id);
    setSent(true);
    setTimeout(() => { setShowSendModal(false); setSent(false); }, 2000);
  };

  const handlePrint = () => window.print();

  const hasPaymentDetails = settings.bankName || settings.accountNumber || settings.sortCode;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h2>
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}>
              {invoice.status}
            </span>
            <button onClick={handlePrint} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="Print">
              <Printer className="w-5 h-5" />
            </button>
            {(invoice.status === "draft" || invoice.status === "sent") && (
              <button onClick={() => setShowSendModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Send className="w-4 h-4" /> Send
              </button>
            )}
            {invoice.status === "sent" && (
              <button onClick={() => markInvoicePaid(invoice.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <CheckCircle className="w-4 h-4" /> Mark Paid
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Billed to</p>
              <p className="font-semibold text-gray-900">{client?.company || client?.name || "—"}</p>
              {client?.email && <p className="text-sm text-gray-600">{client.email}</p>}
              {client?.address && <p className="text-sm text-gray-600">{client.address}, {client.city}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Issue date</p>
              <p className="text-sm text-gray-900">{invoice.issueDate}</p>
              <p className="text-sm text-gray-500 mt-1">Due date</p>
              <p className="text-sm text-gray-900">{invoice.dueDate}</p>
            </div>
          </div>

          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Description</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Qty</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Rate</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="py-2 text-sm text-gray-900">{li.description}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{li.quantity}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{formatCurrency(li.rate)}</td>
                  <td className="py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
              {invoice.status === "paid" && invoice.paidAt && (
                <div className="text-xs text-green-600 text-right">Paid {new Date(invoice.paidAt).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {hasPaymentDetails && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Payment Details</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                {settings.bankName && <div><span className="text-gray-500">Bank: </span><span className="text-gray-900">{settings.bankName}</span></div>}
                {settings.accountName && <div><span className="text-gray-500">Account Name: </span><span className="text-gray-900">{settings.accountName}</span></div>}
                {settings.accountNumber && <div><span className="text-gray-500">Account No: </span><span className="text-gray-900">{settings.accountNumber}</span></div>}
                {settings.sortCode && <div><span className="text-gray-500">Sort Code: </span><span className="text-gray-900">{settings.sortCode}</span></div>}
                {settings.iban && <div className="col-span-2"><span className="text-gray-500">IBAN: </span><span className="text-gray-900">{settings.iban}</span></div>}
              </div>
            </div>
          )}
        </div>

        {showSendModal && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              {sent ? (
                <div className="text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Invoice sent!</p>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-2">Send Invoice</h3>
                  <p className="text-sm text-gray-600 mb-4">Mark this invoice as sent to {client?.email || "the client"}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSendModal(false)} className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSendInvoice} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Send</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to Invoices → View an invoice. Confirm it shows correctly. Go to Settings, add payment details and save. View an invoice again — payment details section should appear at the bottom.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/InvoiceView.tsx && git commit -m "refactor: InvoiceView store-direct, add payment details section"
```

---

### Task 11: Update ClientList.tsx — store-direct + extract ClientRow

**Files:**
- Modify: `src/components/ClientList.tsx`

ClientList becomes self-contained. `ClientRow` sub-component flattens nesting depth from 9 to ≤4.

- [ ] **Step 1: Read the file**

Read `src/components/ClientList.tsx`.

- [ ] **Step 2: Replace ClientList.tsx**

```tsx
// src/components/ClientList.tsx
import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { useClients } from "@/store/useClients";
import { useInvoices } from "@/store/useInvoices";
import { formatCurrency } from "@/utils/format";
import { Client } from "@/types";

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  company: string;
}

const emptyForm: ClientFormData = {
  name: "", email: "", phone: "", address: "", city: "", country: "USA", company: "",
};

interface ClientRowProps {
  client: Client;
  totalBilled: number;
  outstanding: number;
  invoiceCount: number;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  confirmDelete: string | null;
}

function ClientRow({ client, totalBilled, outstanding, invoiceCount, onEdit, onDelete, confirmDelete }: ClientRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{client.company || client.name}</div>
        {client.company && <div className="text-sm text-gray-500">{client.name}</div>}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{client.email}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{client.city}, {client.country}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{invoiceCount} invoices</td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(totalBilled)}</td>
      <td className="px-6 py-4 text-sm text-amber-700">{outstanding > 0 ? formatCurrency(outstanding) : "—"}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onEdit(client)} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client.id)}
            className={`p-1 rounded ${confirmDelete === client.id ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-red-600"}`}
            title={confirmDelete === client.id ? "Click again to confirm" : "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

interface ClientFormModalProps {
  form: ClientFormData;
  editing: boolean;
  onChange: (key: keyof ClientFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function ClientFormModal({ form, editing, onChange, onSubmit, onClose }: ClientFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Client" : "New Client"}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {(["name", "company", "email", "phone", "address", "city"] as (keyof ClientFormData)[]).map((field) => (
              <div key={field} className={field === "address" ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                <input
                  value={form[field]}
                  onChange={(e) => onChange(field, e.target.value)}
                  required={field === "name"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input value={form.country} onChange={(e) => onChange("country", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editing ? "Update" : "Add Client"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientList() {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const { invoices } = useInvoices();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = () => { setEditingClient(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email, phone: client.phone, address: client.address, city: client.city, country: client.country, company: client.company });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) { updateClient(editingClient.id, form); } else { addClient(form); }
    setShowForm(false);
    setEditingClient(null);
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) { deleteClient(id); setConfirmDelete(null); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  const getStats = (clientId: string) => {
    const ci = invoices.filter((i) => i.clientId === clientId);
    return {
      totalBilled: ci.reduce((s, i) => s + i.total, 0),
      outstanding: ci.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0),
      invoiceCount: ci.length,
    };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Client", "Email", "Location", "Invoices", "Total Billed", "Outstanding", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">No clients yet.</td></tr>
            ) : (
              clients.map((client) => {
                const { totalBilled, outstanding, invoiceCount } = getStats(client.id);
                return (
                  <ClientRow
                    key={client.id}
                    client={client}
                    totalBilled={totalBilled}
                    outstanding={outstanding}
                    invoiceCount={invoiceCount}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    confirmDelete={confirmDelete}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ClientFormModal
          form={form}
          editing={editingClient !== null}
          onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to Clients. Add a new client, edit it, delete it (confirm double-click). Verify invoice stats show correctly per client.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/ClientList.tsx && git commit -m "refactor: ClientList store-direct, extract ClientRow + ClientFormModal"
```

---

### Task 12: Update BillList.tsx — store-direct

**Files:**
- Modify: `src/components/BillList.tsx`

BillList becomes self-contained via `useBills`. Props removed entirely.

- [ ] **Step 1: Read the file**

Read `src/components/BillList.tsx`.

- [ ] **Step 2: Update BillList.tsx — replace imports, interface, and function signature**

Replace the top of the file (imports through function signature):

```tsx
// src/components/BillList.tsx
import { useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, X } from "lucide-react";
import { useBills } from "@/store/useBills";
import { formatCurrency } from "@/utils/format";
import { Bill } from "@/types";
```

Replace `interface BillListProps { ... }` and the function signature `function BillList({ bills, nextBillNumber, onAdd, onUpdate, onDelete }: BillListProps)` with:

```tsx
export default function BillList() {
  const { bills, addBill, updateBill, deleteBill, getNextBillNumber } = useBills();
```

Then inside the function body, replace:
- `onAdd(form)` → `addBill(form)`
- `onUpdate(editingBill.id, form)` → `updateBill(editingBill.id, form)`
- `onDelete(id)` → `deleteBill(id)`
- `onUpdate(bill.id, { status: 'paid' })` → `updateBill(bill.id, { status: 'paid' })`
- `nextBillNumber` → `getNextBillNumber()`

Also remove the local `formatCurrency` function definition (it's now imported).

- [ ] **Step 3: Verify in browser**

Navigate to Bills. Add a bill, edit it, mark it paid, delete it.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/BillList.tsx && git commit -m "refactor: BillList store-direct"
```

---

### Task 13: Update Reports.tsx — store-direct

**Files:**
- Modify: `src/components/Reports.tsx`

Reports becomes self-contained via domain hooks. Props removed.

- [ ] **Step 1: Read the file**

Read `src/components/Reports.tsx`.

- [ ] **Step 2: Replace imports, interface, and function signature**

Replace the import block at the top:

```tsx
import { useInvoices } from "@/store/useInvoices";
import { useBills } from "@/store/useBills";
import { useClients } from "@/store/useClients";
import { useActivity } from "@/store/useActivity";
import { formatCurrency } from "@/utils/format";
// keep all existing recharts + lucide imports
```

Replace `interface ReportsProps { ... }` and the function signature with:

```tsx
export default function Reports() {
  const { invoices } = useInvoices();
  const { bills } = useBills();
  const { clients } = useClients();
  const { activityLog } = useActivity();
```

Remove the local `formatCurrency` function definition.

- [ ] **Step 3: Verify in browser**

Navigate to Reports. Confirm charts and summaries render with real data.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Reports.tsx && git commit -m "refactor: Reports store-direct"
```

---

### Task 14: Update Settings.tsx — add payment details

**Files:**
- Modify: `src/components/Settings.tsx`

Add `bankName`, `accountName`, `accountNumber`, `sortCode`, `iban` fields to `BusinessSettings` and add a "Payment Details" section to the UI.

- [ ] **Step 1: Read the file**

Read `src/components/Settings.tsx`.

- [ ] **Step 2: Update the BusinessSettings interface**

Replace the existing `BusinessSettings` interface:

```typescript
interface BusinessSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  taxId: string;
  defaultTaxRate: number;
  currency: string;
  invoicePrefix: string;
  paymentTerms: string;
  invoiceNotes: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  iban: string;
}
```

- [ ] **Step 3: Update defaultSettings**

Replace the `defaultSettings` constant:

```typescript
const defaultSettings: BusinessSettings = {
  businessName: "BizFlow Pro",
  email: "billing@bizflowpro.com",
  phone: "+1 (555) 000-0000",
  address: "123 Business Street",
  city: "New York, NY 10001",
  country: "USA",
  website: "www.bizflowpro.com",
  taxId: "TAX-123456789",
  defaultTaxRate: 10,
  currency: "USD",
  invoicePrefix: "INV",
  paymentTerms: "30",
  invoiceNotes: "Thank you for your business! Payment is due within the specified period.",
  bankName: "",
  accountName: "",
  accountNumber: "",
  sortCode: "",
  iban: "",
};
```

- [ ] **Step 4: Add Payment Details section to the JSX**

Inside the Settings component JSX, after the existing "Invoice Settings" section and before the Save button, add:

```tsx
{/* Payment Details */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
  <p className="text-sm text-gray-500 mb-4">These details appear at the bottom of every invoice.</p>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {(["bankName", "accountName", "accountNumber", "sortCode"] as (keyof BusinessSettings)[]).map((field) => (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field === "bankName" ? "Bank Name" : field === "accountName" ? "Account Name" : field === "accountNumber" ? "Account Number" : "Sort Code"}
        </label>
        <input
          value={settings[field] as string}
          onChange={(e) => update(field, e.target.value)}
          placeholder={field === "sortCode" ? "e.g. 20-00-00" : ""}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    ))}
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">IBAN <span className="text-gray-400">(optional, for international clients)</span></label>
      <input
        value={settings.iban}
        onChange={(e) => update("iban", e.target.value)}
        placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 5: Verify in browser**

Navigate to Settings. Confirm the new Payment Details section appears. Fill in bank details and click Save. View an invoice — payment details should appear.

- [ ] **Step 6: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Settings.tsx && git commit -m "feat: add payment details fields to Settings"
```

---

### Task 15: Delete useStore.ts and run final checks

**Files:**
- Delete: `src/store/useStore.ts`

- [ ] **Step 1: Delete the old store**

```bash
cd "/Users/ilir/Desktop/invoices app" && rm src/store/useStore.ts
```

- [ ] **Step 2: Verify no remaining imports of useStore**

```bash
cd "/Users/ilir/Desktop/invoices app" && grep -r "useStore" src/
```

Expected: no output (zero references).

- [ ] **Step 3: Run the dev server and verify the full app**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

Walk through every page: Dashboard, Invoices, Bills, Clients, Reports, Settings. Confirm:
- Data loads correctly
- Add/edit/delete works on each page
- Invoice create/edit modal works
- Invoice view modal works with Send and Mark Paid
- Payment details appear in invoice view after saving in Settings

- [ ] **Step 4: Run tests**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run build to confirm no TypeScript errors**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Re-index the repo**

```bash
# jCodemunch will auto-detect the changes via register_edit
```

Call `mcp__jcodemunch__index_folder` with path `/Users/ilir/Desktop/invoices app` to refresh the index.

- [ ] **Step 7: Final commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add -A && git commit -m "refactor: delete useStore.ts — fully replaced by AppContext + domain hooks"
```

---

*Phase 1 complete. All dead code removed, store split into domain hooks, components self-contained, App.tsx is layout-only, payment details live in Settings and appear on invoices.*
