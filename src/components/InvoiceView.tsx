import { useState } from "react";
import { X, Printer, Send, CheckCircle } from "lucide-react";
import { useInvoices } from "@/store/useInvoices";
import { useClients } from "@/store/useClients";
import { formatCurrency } from "@/utils/format";

const SETTINGS_KEY = "bizflow_settings";

function loadPaymentDetails() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-50 text-red-400",
};

interface InvoiceViewProps {
  invoiceId: string;
  onClose: () => void;
}

export default function InvoiceView({ invoiceId, onClose }: InvoiceViewProps) {
  const { invoices, sendInvoice, markInvoicePaid } = useInvoices();
  const { clients } = useClients();
  const [showSendModal, setShowSendModal] = useState(false);
  const [sent, setSent] = useState(false);

  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = invoice ? clients.find((c) => c.id === invoice.clientId) : undefined;
  const settings = loadPaymentDetails();

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-500">Invoice not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  const handleSendInvoice = () => {
    sendInvoice(invoice.id);
    setSent(true);
    setTimeout(() => { setShowSendModal(false); setSent(false); }, 2000);
  };

  const handlePrint = () => window.print();

  const hasPaymentDetails = settings.bankName || settings.accountNumber || settings.sortCode;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h2>
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}>
              {invoice.status}
            </span>
            <button onClick={handlePrint} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="Print">
              <Printer className="w-5 h-5" />
            </button>
            {(invoice.status === "draft" || invoice.status === "sent") && (
              <button onClick={() => setShowSendModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Send className="w-4 h-4" /> Send
              </button>
            )}
            {invoice.status === "sent" && (
              <button onClick={() => markInvoicePaid(invoice.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <CheckCircle className="w-4 h-4" /> Mark Paid
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Billed to</p>
              <p className="font-semibold text-gray-900">{client?.company || client?.name || "—"}</p>
              {client?.email && <p className="text-sm text-gray-600">{client.email}</p>}
              {client?.address && <p className="text-sm text-gray-600">{client.address}, {client.city}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Issue date</p>
              <p className="text-sm text-gray-900">{invoice.issueDate}</p>
              <p className="text-sm text-gray-500 mt-1">Due date</p>
              <p className="text-sm text-gray-900">{invoice.dueDate}</p>
            </div>
          </div>

          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Description</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Qty</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Rate</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="py-2 text-sm text-gray-900">{li.description}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{li.quantity}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{formatCurrency(li.rate)}</td>
                  <td className="py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
              {invoice.status === "paid" && invoice.paidAt && (
                <div className="text-xs text-green-600 text-right">Paid {new Date(invoice.paidAt).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {hasPaymentDetails && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Payment Details</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                {settings.bankName && <div><span className="text-gray-500">Bank: </span><span className="text-gray-900">{settings.bankName}</span></div>}
                {settings.accountName && <div><span className="text-gray-500">Account Name: </span><span className="text-gray-900">{settings.accountName}</span></div>}
                {settings.accountNumber && <div><span className="text-gray-500">Account No: </span><span className="text-gray-900">{settings.accountNumber}</span></div>}
                {settings.sortCode && <div><span className="text-gray-500">Sort Code: </span><span className="text-gray-900">{settings.sortCode}</span></div>}
                {settings.iban && <div className="col-span-2"><span className="text-gray-500">IBAN: </span><span className="text-gray-900">{settings.iban}</span></div>}
              </div>
            </div>
          )}
        </div>

        {showSendModal && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              {sent ? (
                <div className="text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Invoice sent!</p>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-2">Send Invoice</h3>
                  <p className="text-sm text-gray-600 mb-4">Mark this invoice as sent to {client?.email || "the client"}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSendModal(false)} className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSendInvoice} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Send</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
