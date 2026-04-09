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
