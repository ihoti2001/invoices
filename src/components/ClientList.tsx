import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Users, Mail, Phone, Building2, X } from 'lucide-react';
import { Client, Invoice } from '../types';

interface ClientListProps {
  clients: Client[];
  invoices: Invoice[];
  onAdd: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

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
  name: '', email: '', phone: '', address: '', city: '', country: 'USA', company: '',
};

export default function ClientList({ clients, invoices, onAdd, onUpdate, onDelete }: ClientListProps) {
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      company: client.company,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      onUpdate(editingClient.id, form);
    } else {
      onAdd(form);
    }
    setShowForm(false);
    setEditingClient(null);
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const getClientStats = (clientId: string) => {
    const clientInvoices = invoices.filter(i => i.clientId === clientId);
    const totalBilled = clientInvoices.reduce((s, i) => s + i.total, 0);
    const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = clientInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    return { totalBilled, totalPaid, outstanding, invoiceCount: clientInvoices.length };
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow"
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total Clients</div>
          <div className="text-2xl font-bold text-gray-800">{clients.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total Billed</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total Collected</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0))}</div>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No clients found</p>
          </div>
        ) : filtered.map(client => {
          const stats = getClientStats(client.id);
          return (
            <div key={client.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(client.company || client.name).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{client.company || client.name}</div>
                    {client.company && <div className="text-xs text-gray-500">{client.name}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewClient(client)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className={`p-1.5 rounded transition-colors ${confirmDelete === client.id ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="hover:text-blue-600 truncate">{client.email}</a>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {(client.city || client.country) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{[client.city, client.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Invoices</div>
                  <div className="font-semibold text-gray-800">{stats.invoiceCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Billed</div>
                  <div className="font-semibold text-blue-700 text-xs">{formatCurrency(stats.totalBilled)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Outstanding</div>
                  <div className={`font-semibold text-xs ${stats.outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatCurrency(stats.outstanding)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-800">{editingClient ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Modal */}
      {viewClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Client Details</h2>
              <button onClick={() => setViewClient(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {(viewClient.company || viewClient.name).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{viewClient.company || viewClient.name}</div>
                  {viewClient.company && <div className="text-gray-500">{viewClient.name}</div>}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-gray-400" />{viewClient.email}</div>
                <div className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-gray-400" />{viewClient.phone || 'N/A'}</div>
                <div className="flex items-start gap-3 text-gray-700"><Building2 className="w-4 h-4 text-gray-400 mt-0.5" /><span>{[viewClient.address, viewClient.city, viewClient.country].filter(Boolean).join(', ')}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                {(() => {
                  const stats = getClientStats(viewClient.id);
                  return (
                    <>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Invoices</div>
                        <div className="font-bold text-gray-800">{stats.invoiceCount}</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Total Billed</div>
                        <div className="font-bold text-blue-700 text-sm">{formatCurrency(stats.totalBilled)}</div>
                      </div>
                      <div className="text-center bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Collected</div>
                        <div className="font-bold text-green-700 text-sm">{formatCurrency(stats.totalPaid)}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
