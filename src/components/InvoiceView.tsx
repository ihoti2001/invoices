import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Send, CheckCircle, Printer } from 'lucide-react';
import { Invoice, Client } from '../types';
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/format";

interface InvoiceViewProps {
  invoice: Invoice;
  client: Client | undefined;
  onClose: () => void;
  onSend: (id: string, email: string) => Promise<void>;
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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("settings").select("data").eq("user_id", user.id).single();
      if (data?.data) setSettings(data.data);
    }
    load();
  }, []);

  const handleSend = async () => {
    if (!client?.email) return;
    setSendError('');
    setSending(true);
    try {
      await onSend(invoice.id, client.email);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const currency = settings.currency || 'GBP';
  const businessName = settings.businessName || 'My Business';
  const businessEmail = settings.email || '';
  const businessPhone = settings.phone || '';
  const businessAddress = settings.address || '';
  const businessCity = settings.city || '';
  const businessPostcode = settings.postcode || '';
  const businessCountry = settings.country || '';
  const hasPaymentDetails = settings.bankName || settings.accountNumber || settings.sortCode;

  const initials = businessName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

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
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleSend}
                    disabled={sending || !client?.email}
                    title={!client?.email ? 'No email on file for this client' : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[oklch(42%_0.11_200)] hover:bg-[oklch(36%_0.11_200)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {sending ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {sending ? 'Sending…' : sendSuccess ? 'Sent ✓' : 'Send to Client'}
                  </button>
                  {sendError && (
                    <p className="text-xs text-red-600 max-w-xs text-right">{sendError}</p>
                  )}
                </div>
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
                  <div className="w-10 h-10 rounded-lg bg-[oklch(42%_0.11_200)] flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{businessName}</div>
                    {businessEmail && <div className="text-xs text-gray-500">{businessEmail}</div>}
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  {businessAddress && <p>{businessAddress}</p>}
                  {(businessCity || businessPostcode || businessCountry) && (
                    <p>{[businessCity, businessPostcode, businessCountry].filter(Boolean).join(', ')}</p>
                  )}
                  {businessPhone && <p>{businessPhone}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">INVOICE</div>
                <div className="text-lg font-semibold text-[oklch(42%_0.11_200)] mb-3">{invoice.invoiceNumber}</div>
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
                  <p className="text-gray-600">{[client.city, client.postcode, client.country].filter(Boolean).join(', ')}</p>
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
                    <td className="py-3 text-right text-gray-600">{formatCurrency(li.rate, currency)}</td>
                    <td className="py-3 text-right font-medium text-gray-800">{formatCurrency(li.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(invoice.taxAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total, currency)}</span>
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

            {/* Payment Details */}
            {hasPaymentDetails && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</div>
                <div className="text-sm text-gray-600 space-y-1">
                  {settings.bankName && <p><span className="font-medium">Bank:</span> {settings.bankName}</p>}
                  {settings.accountName && <p><span className="font-medium">Account Name:</span> {settings.accountName}</p>}
                  {settings.accountNumber && <p><span className="font-medium">Account Number:</span> {settings.accountNumber}</p>}
                  {settings.sortCode && <p><span className="font-medium">Sort Code:</span> {settings.sortCode}</p>}
                  {settings.iban && <p><span className="font-medium">IBAN:</span> {settings.iban}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function handlePrint() {
  window.print();
}
