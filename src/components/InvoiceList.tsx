import { useState } from "react";
import { Plus, Eye, Edit, Trash2, Send, CheckCircle } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { formatCurrency } from "@/utils/format";
import { Invoice, Client, InvoiceStatus } from "@/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-50 text-red-400",
};

const ALL_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "cancelled"];

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
  onSend: (id: string, email: string) => Promise<void>;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  confirmDelete: string | null;
}

function InvoiceRow({ invoice, client, onEdit, onView, onSend, onMarkPaid, onDelete, onStatusChange, confirmDelete }: InvoiceRowProps) {
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
        <select
          value={invoice.status}
          onChange={(e) => onStatusChange(invoice.id, e.target.value as InvoiceStatus)}
          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)] ${statusColors[invoice.status] || "bg-gray-100 text-gray-600"}`}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onView(invoice.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="View">
            <Eye className="w-4 h-4" />
          </button>
          {invoice.status === "draft" && (
            <button onClick={() => onEdit(invoice.id)} className="p-1 text-gray-400 hover:text-[oklch(42%_0.11_200)] rounded" title="Edit">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button onClick={() => onSend(invoice.id, client?.email ?? '')} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Send">
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
  const { invoices, updateInvoice, sendInvoice, markInvoicePaid, deleteInvoice } = useInvoices();
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
          className="flex items-center gap-2 bg-[oklch(42%_0.11_200)] text-white px-4 py-2 rounded-lg hover:bg-[oklch(36%_0.11_200)] text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-[oklch(42%_0.11_200)] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
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
                  onStatusChange={(id, status) => updateInvoice(id, { status })}
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
