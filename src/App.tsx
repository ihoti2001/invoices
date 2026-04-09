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

type Page = "dashboard" | "invoices" | "bills" | "clients" | "reports" | "settings";

type Modal =
  | { type: "invoice-form"; invoiceId?: string }
  | { type: "invoice-view"; invoiceId: string }
  | null;

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const { sendInvoice } = useInvoices();

  const handleSendFromView = async (id: string, email: string) => {
    await sendInvoice(id, email);
  };

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
      {modal?.type === "invoice-view" && (
        <InvoiceView
          invoiceId={modal.invoiceId}
          onClose={() => setModal(null)}
          onSend={handleSendFromView}
        />
      )}
    </div>
  );
}

export default App;
