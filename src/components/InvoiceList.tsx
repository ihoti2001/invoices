import { useState } from 'react';
import { Plus, Search, Eye, Send, CheckCircle, Trash2, Edit, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Invoice, Client } from '../types';

interface InvoiceListProps {
  invoices: Invoice[];
  clients: Client[];
  onAdd: () => void;
  onEdit: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  onSend: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function InvoiceList({ invoices, clients, onAdd, onEdit, onView, onSend, onMarkPaid, onDelete }: InvoiceListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const filtered = invoices.filter(inv => {
    const client = getClient(inv.clientId);
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      client?.name.toLowerCase().includes(search.toLowerCase()) ||
      client?.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: invoices.reduce((s, i) => s + i.total, 0), color: 'text-gray-800' },
          { label: 'Outstanding', value: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0), color: 'text-blue-700' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0), color: 'text-red-600' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0), color: 'text-green-700' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className={`font-bold text-lg ${card.color}`}>{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice #</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Client</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Issue Date</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Due Date</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-center px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-center px-5 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                </td>
              </tr>
            ) : filtered.map(inv => {
              const client = getClient(inv.clientId);
              return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-blue-600">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800">{client?.company || client?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-400">{client?.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{format(parseISO(inv.issueDate), 'MMM dd, yyyy')}</td>
                  <td className="px-5 py-3.5 text-gray-600">{format(parseISO(inv.dueDate), 'MMM dd, yyyy')}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status]}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onView(inv)} title="View" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEdit(inv)} title="Edit" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(inv.status === 'draft' || inv.status === 'sent') && (
                        <button onClick={() => onSend(inv.id)} title="Send to client" className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {inv.status !== 'paid' && inv.status !== 'draft' && (
                        <button onClick={() => onMarkPaid(inv.id)} title="Mark as paid" className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv.id)}
                        title={confirmDelete === inv.id ? 'Click again to confirm' : 'Delete'}
                        className={`p-1.5 rounded transition-colors ${confirmDelete === inv.id ? 'bg-red-100 text-red-600' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
