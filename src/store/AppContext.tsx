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
  sendInvoice: (id: string, recipientEmail: string) => Promise<void>;
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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await addActivityEntry(`Client updated: ${updates.company || updates.name || id}`, "client");
  };

  const deleteClient = async (id: string): Promise<void> => {
    const client = clients.find((c) => c.id === id);
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }

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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (inv) await addActivityEntry(`Invoice ${inv.invoiceNumber} deleted`, "invoice");
  };

  const sendInvoice = async (id: string, recipientEmail: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: _d, error } = await supabase.functions.invoke("send-invoice", {
      body: { invoiceId: id, recipientEmail },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
    await updateInvoice(id, { status: "sent" });
    const inv = invoices.find((i) => i.id === id);
    if (inv) await addActivityEntry(`Invoice ${inv.invoiceNumber} sent to ${recipientEmail}`, "invoice");
  };

  const markInvoicePaid = async (id: string): Promise<void> => {
    const inv = invoices.find((i) => i.id === id);
    const client = clients.find((c) => c.id === inv?.clientId);
    const paidAt = new Date().toISOString();
    await updateInvoice(id, { status: "paid", paidAt });
    if (inv) await addActivityEntry(`Payment received from ${client?.company || client?.name} — ${inv.total.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 })}`, "payment");
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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
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
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBill = async (id: string): Promise<void> => {
    const bill = bills.find((b) => b.id === id);
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) {
      const res = (error as unknown as { context?: Response }).context;
      if (res) {
        try {
          const text = await res.text();
          console.error('Edge Function error body:', text);
          let msg: string = text;
          try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* not json */ }
          throw new Error(msg || error.message);
        } catch (readErr) {
          if (readErr !== error && readErr instanceof Error) throw readErr;
        }
      }
      throw error;
    }
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
