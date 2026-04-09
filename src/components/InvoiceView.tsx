import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Send, CheckCircle, Printer } from 'lucide-react';
import { Invoice, Client } from '../types';

interface InvoiceViewProps {
  invoice: Invoice;
  client: Client | undefined;
  onClose: () => void;
  onSend: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function InvoiceView({ invoice, client, onClose, onSend, onMarkPaid }: InvoiceViewProps) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState(client?.email || '');
  const [sendMessage, setSendMessage] = useState(`Dear ${client?.name || 'Client'},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)}.\n\nPayment is due by ${format(parseISO(invoice.dueDate), 'MMMM dd, yyyy')}.\n\nThank you for your business!\n\nBest regards,\nBizFlow Pro`);
  const [sent, setSent] = useState(false);

  const handleSendInvoice = () => {
    onSend(invoice.id);
    setSent(true);
    setTimeout(() => {
      setShowSendModal(false);
      setSent(false);
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800">{invoice.invoiceNumber}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.status]}`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" /> Send to Client
                </button>
              )}
              {invoice.status !== 'paid' && invoice.status !== 'draft' && (
                <button
                  onClick={() => onMarkPaid(invoice.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Paid
                </button>
              )}
              <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Print">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="p-8" id="invoice-print">
            {/* Company & Invoice Info */}
            <div className="flex justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">BZ</div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">BizFlow Pro</div>
                    <div className="text-xs text-gray-500">billing@bizflowpro.com</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>123 Business Street</p>
                  <p>New York, NY 10001</p>
                  <p>+1 (555) 000-0000</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">INVOICE</div>
                <div className="text-lg font-semibold text-blue-600 mb-3">{invoice.invoiceNumber}</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-500">Issue Date:</span>
                    <span className="font-medium">{format(parseISO(invoice.issueDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-500">Due Date:</span>
                    <span className="font-medium">{format(parseISO(invoice.dueDate), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</div>
              {client ? (
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 text-base">{client.company || client.name}</p>
                  {client.company && <p className="text-gray-600">{client.name}</p>}
                  <p className="text-gray-600">{client.email}</p>
                  <p className="text-gray-600">{client.phone}</p>
                  <p className="text-gray-600">{client.address}</p>
                  <p className="text-gray-600">{client.city}, {client.country}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Client not found</p>
              )}
            </div>

            {/* Line Items */}
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-700">Description</th>
                  <th className="text-center py-2 font-semibold text-gray-700 w-16">Qty</th>
                  <th className="text-right py-2 font-semibold text-gray-700 w-24">Rate</th>
                  <th className="text-right py-2 font-semibold text-gray-700 w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lineItems.map(li => (
                  <tr key={li.id}>
                    <td className="py-3 text-gray-700">{li.description}</td>
                    <td className="py-3 text-center text-gray-600">{li.quantity}</td>
                    <td className="py-3 text-right text-gray-600">${li.rate.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium text-gray-800">${li.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>${invoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>${invoice.total.toFixed(2)}</span>
                </div>
                {invoice.status === 'paid' && invoice.paidAt && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Paid on</span>
                    <span>{format(parseISO(invoice.paidAt), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Invoice Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Send Invoice to Client</h3>
              <button onClick={() => setShowSendModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="font-semibold text-gray-800">Invoice Sent!</p>
                  <p className="text-sm text-gray-500 mt-1">Sent to {sendEmail}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="email"
                      value={sendEmail}
                      onChange={e => setSendEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="client@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      defaultValue={`Invoice ${invoice.invoiceNumber} from BizFlow Pro`}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={sendMessage}
                      onChange={e => setSendMessage(e.target.value)}
                      rows={6}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">📎 Invoice {invoice.invoiceNumber} — ${invoice.total.toFixed(2)} will be attached as a PDF</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowSendModal(false)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendInvoice}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Send className="w-4 h-4" /> Send Invoice
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
