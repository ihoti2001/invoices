import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import InvoiceList from "./components/InvoiceList";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceView from "./components/InvoiceView";
import BillList from "./components/BillList";
import ClientList from "./components/ClientList";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";

type Page = "dashboard" | "invoices" | "bills" | "clients" | "reports" | "settings";

type Modal =
  | { type: "invoice-form"; invoiceId?: string }
  | { type: "invoice-view"; invoiceId: string }
  | null;

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const { invoices, sendInvoice, markInvoicePaid } = useInvoices();
  const { clients } = useClients();

  const viewInvoice = modal?.type === "invoice-view"
    ? invoices.find((i) => i.id === modal.invoiceId)
    : undefined;
  const viewClient = viewInvoice
    ? clients.find((c) => c.id === viewInvoice.clientId)
    : undefined;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar currentPage={page} onNavigate={(p) => setPage(p as Page)} />

      <main className="flex-1 overflow-auto">
        {page === "dashboard" && (
          <Dashboard
            onNavigate={(p) => setPage(p as Page)}
            onAddInvoice={() => setModal({ type: "invoice-form" })}
          />
        )}
        {page === "invoices" && (
          <InvoiceList
            onAdd={() => setModal({ type: "invoice-form" })}
            onEdit={(id) => setModal({ type: "invoice-form", invoiceId: id })}
            onView={(id) => setModal({ type: "invoice-view", invoiceId: id })}
          />
        )}
        {page === "bills" && <BillList />}
        {page === "clients" && <ClientList />}
        {page === "reports" && <Reports />}
        {page === "settings" && <Settings />}
      </main>

      {modal?.type === "invoice-form" && (
        <InvoiceForm
          invoiceId={modal.invoiceId}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "invoice-view" && viewInvoice && (
        <InvoiceView
          invoice={viewInvoice}
          client={viewClient}
          onClose={() => setModal(null)}
          onSend={sendInvoice}
          onMarkPaid={markInvoicePaid}
        />
      )}
    </div>
  );
}

export default App;
