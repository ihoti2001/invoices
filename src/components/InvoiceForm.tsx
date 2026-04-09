import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Invoice, Client, LineItem } from '../types';

interface InvoiceFormProps {
  invoice?: Invoice | null;
  clients: Client[];
  nextInvoiceNumber: string;
  onSave: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function calcTotals(lineItems: LineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export default function InvoiceForm({ invoice, clients, nextInvoiceNumber, onSave, onCancel }: InvoiceFormProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || nextInvoiceNumber);
  const [clientId, setClientId] = useState(invoice?.clientId || '');
  const [status, setStatus] = useState<Invoice['status']>(invoice?.status || 'draft');
  const [issueDate, setIssueDate] = useState(invoice?.issueDate || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 10);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]
  );

  const { subtotal, taxAmount, total } = calcTotals(lineItems, taxRate);

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated.amount = Number(updated.quantity) * Number(updated.rate);
      }
      return updated;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      invoiceNumber,
      clientId,
      status,
      issueDate,
      dueDate,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes,
      ...(invoice?.paidAt ? { paidAt: invoice.paidAt } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Invoice['status'])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company || c.name} — {c.email}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-center">Rate</span>
                <span className="col-span-2 text-right">Amount</span>
                <span className="col-span-1"></span>
              </div>
              {lineItems.map(li => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                    value={li.description}
                    onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={li.quantity}
                    min={0}
                    onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  <input
                    type="number"
                    className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={li.rate}
                    min={0}
                    step={0.01}
                    onChange={e => updateLineItem(li.id, 'rate', parseFloat(e.target.value) || 0)}
                  />
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                    ${li.amount.toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLineItem(li.id)}
                    className="col-span-1 flex justify-center p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="mt-2 flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <input
                  type="number"
                  value={taxRate}
                  min={0}
                  max={100}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-14 border border-gray-200 rounded px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span>%</span>
              </div>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional notes or payment instructions..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
