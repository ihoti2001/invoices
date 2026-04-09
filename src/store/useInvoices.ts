import { useAppContext } from "./AppContext";

export function useInvoices() {
  const {
    invoices,
    addInvoice, updateInvoice, deleteInvoice,
    sendInvoice, markInvoicePaid, getNextInvoiceNumber,
  } = useAppContext();
  return {
    invoices,
    addInvoice, updateInvoice, deleteInvoice,
    sendInvoice, markInvoicePaid, getNextInvoiceNumber,
  };
}
