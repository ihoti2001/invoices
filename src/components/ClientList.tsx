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
