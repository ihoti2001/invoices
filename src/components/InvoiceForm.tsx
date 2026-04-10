import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { useSettings } from "@/store/useSettings";
import { formatCurrency } from "@/utils/format";
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
  const { currency } = useSettings();

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
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]">
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="flex items-center gap-1 text-xs text-[oklch(42%_0.11_200)] hover:text-[oklch(32%_0.11_200)]">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(li.id, "description", e.target.value)} className="col-span-5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
                  <input type="number" placeholder="Qty" value={li.quantity} onChange={(e) => updateLineItem(li.id, "quantity", Number(e.target.value))} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
                  <input type="number" placeholder="Rate" value={li.rate} onChange={(e) => updateLineItem(li.id, "rate", Number(e.target.value))} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
                  <div className="col-span-2 text-sm text-gray-700 text-right">{formatCurrency(li.amount, currency)}</div>
                  <button type="button" onClick={() => removeLineItem(li.id)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Tax</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs text-right" />
                  <span className="text-xs">%</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-[oklch(42%_0.11_200)] text-white rounded-lg hover:bg-[oklch(36%_0.11_200)]">
              {invoice ? "Update Invoice" : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
