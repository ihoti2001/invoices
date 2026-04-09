import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import InvoiceView from './components/InvoiceView';
import ClientList from './components/ClientList';
import BillList from './components/BillList';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { useStore } from './store/useStore';
import { Invoice } from './types';

type Page = 'dashboard' | 'invoices' | 'bills' | 'clients' | 'reports' | 'settings';

type Modal =
  | { type: 'invoice-form'; invoice?: Invoice }
  | { type: 'invoice-view'; invoice: Invoice }
  | null;

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [modal, setModal] = useState<Modal>(null);

  const store = useStore();

  const handleAddNew = () => {
    setPage('invoices');
    setModal({ type: 'invoice-form' });
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setModal({ type: 'invoice-form', invoice });
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setModal({ type: 'invoice-view', invoice });
  };

  const handleSaveInvoice = (data: Omit<Invoice, 'id' | 'createdAt'>) => {
    if (modal?.type === 'invoice-form' && modal.invoice) {
      store.updateInvoice(modal.invoice.id, data);
    } else {
      store.addInvoice(data);
    }
    setModal(null);
  };

  const handleSendFromView = (id: string) => {
    store.sendInvoice(id);
    // Update modal invoice if viewing
    if (modal?.type === 'invoice-view') {
      const updated = store.invoices.find(i => i.id === id);
      if (updated) setModal({ type: 'invoice-view', invoice: { ...updated, status: 'sent' } });
    }
  };

  const handleMarkPaidFromView = (id: string) => {
    store.markInvoicePaid(id);
    if (modal?.type === 'invoice-view') {
      const updated = store.invoices.find(i => i.id === id);
      if (updated) setModal({ type: 'invoice-view', invoice: { ...updated, status: 'paid', paidAt: new Date().toISOString() } });
    }
  };

  const getModalInvoiceClient = () => {
    if (modal?.type === 'invoice-view') {
      return store.clients.find(c => c.id === modal.invoice.clientId);
    }
    return undefined;
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar currentPage={page} onNavigate={(p) => setPage(p as Page)} />

      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && (
          <Dashboard
            clients={store.clients}
            invoices={store.invoices}
            bills={store.bills}
            activityLog={store.activityLog}
            onNavigate={(p) => setPage(p as Page)}
            onAddNew={handleAddNew}
          />
        )}
        {page === 'invoices' && (
          <InvoiceList
            invoices={store.invoices}
            clients={store.clients}
            onAdd={() => setModal({ type: 'invoice-form' })}
            onEdit={handleEditInvoice}
            onView={handleViewInvoice}
            onSend={store.sendInvoice}
            onMarkPaid={store.markInvoicePaid}
            onDelete={store.deleteInvoice}
          />
        )}
        {page === 'bills' && (
          <BillList
            bills={store.bills}
            nextBillNumber={store.getNextBillNumber()}
            onAdd={store.addBill}
            onUpdate={store.updateBill}
            onDelete={store.deleteBill}
          />
        )}
        {page === 'clients' && (
          <ClientList
            clients={store.clients}
            invoices={store.invoices}
            onAdd={store.addClient}
            onUpdate={store.updateClient}
            onDelete={store.deleteClient}
          />
        )}
        {page === 'reports' && (
          <Reports
            invoices={store.invoices}
            bills={store.bills}
            clients={store.clients}
            activityLog={store.activityLog}
          />
        )}
        {page === 'settings' && <Settings />}
      </main>

      {/* Invoice Form Modal */}
      {modal?.type === 'invoice-form' && (
        <InvoiceForm
          invoice={modal.invoice}
          clients={store.clients}
          nextInvoiceNumber={store.getNextInvoiceNumber()}
          onSave={handleSaveInvoice}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Invoice View Modal */}
      {modal?.type === 'invoice-view' && (
        <InvoiceView
          invoice={modal.invoice}
          client={getModalInvoiceClient()}
          onClose={() => setModal(null)}
          onSend={handleSendFromView}
          onMarkPaid={handleMarkPaidFromView}
        />
      )}
    </div>
  );
}
