// src/store/useInvoices.ts
import { useAppContext } from "./AppContext";

export function useInvoices() {
  const { loading, invoices, addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid, getNextInvoiceNumber } = useAppContext();
  return { loading, invoices, addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid, getNextInvoiceNumber };
}
