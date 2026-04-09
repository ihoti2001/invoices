import { useState } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle, Receipt, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Bill } from '../types';

interface BillListProps {
  bills: Bill[];
  nextBillNumber: string;
  onAdd: (bill: Omit<Bill, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Bill>) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const CATEGORIES = ['Software', 'Cloud Services', 'Office', 'Utilities', 'Marketing', 'Travel', 'Insurance', 'Other'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

interface BillFormData {
  billNumber: string;
  vendor: string;
  category: string;
  status: Bill['status'];
  issueDate: string;
  dueDate: string;
  amount: number;
  description: string;
}

export default function BillList({ bills, nextBillNumber, onAdd, onUpdate, onDelete }: BillListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState<BillFormData>({
    billNumber: nextBillNumber,
    vendor: '',
    category: 'Other',
    status: 'pending',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    amount: 0,
    description: '',
  });

  const filtered = bills.filter(b => {
    const matchesSearch = b.vendor.toLowerCase().includes(search.toLowerCase()) ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openAdd = () => {
    setEditingBill(null);
    setForm({
      billNumber: nextBillNumber,
      vendor: '',
      category: 'Other',
      status: 'pending',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      amount: 0,
      description: '',
    });
    setShowForm(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setForm({
      billNumber: bill.billNumber,
      vendor: bill.vendor,
      category: bill.category,
      status: bill.status,
      issueDate: bill.issueDate,
      dueDate: bill.dueDate,
      amount: bill.amount,
      description: bill.description,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBill) {
      onUpdate(editingBill.id, form);
    } else {
      onAdd(form);
    }
    setShowForm(false);
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

  const handleMarkPaid = (bill: Bill) => {
    onUpdate(bill.id, { status: 'paid' });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Bills</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow"
        >
          <Plus className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bills..."
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
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total Bills</div>
          <div className="font-bold text-xl text-gray-800">{formatCurrency(bills.reduce((s, b) => s + b.amount, 0))}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Pending</div>
          <div className="font-bold text-xl text-amber-600">{formatCurrency(bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0))}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Overdue</div>
          <div className="font-bold text-xl text-red-600">{formatCurrency(bills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0))}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Bill #</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Vendor</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Category</th>
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
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No bills found</p>
                </td>
              </tr>
            ) : filtered.map(bill => (
              <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-blue-600">{bill.billNumber}</td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-gray-800">{bill.vendor}</div>
                  {bill.description && <div className="text-xs text-gray-400 truncate max-w-32">{bill.description}</div>}
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{bill.category}</span>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{format(parseISO(bill.dueDate), 'MMM dd, yyyy')}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{formatCurrency(bill.amount)}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[bill.status]}`}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(bill)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    {bill.status !== 'paid' && (
                      <button onClick={() => handleMarkPaid(bill)} title="Mark as paid" className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className={`p-1.5 rounded transition-colors ${confirmDelete === bill.id ? 'bg-red-100 text-red-500' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-800">{editingBill ? 'Edit Bill' : 'New Bill'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                  <input
                    value={form.billNumber}
                    onChange={e => setForm(f => ({ ...f, billNumber: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as Bill['status'] }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <input
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
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
                  {editingBill ? 'Update Bill' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
