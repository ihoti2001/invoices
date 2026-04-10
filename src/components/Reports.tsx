import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react';
import { useInvoices } from "@/store/useInvoices";
import { useBills } from "@/store/useBills";
import { useClients } from "@/store/useClients";
import { useActivity } from "@/store/useActivity";
import { useSettings } from "@/store/useSettings";
import { formatCurrency } from "@/utils/format";

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const MONTH_LABELS: Record<string, string> = {
  '2026-01': 'Jan', '2026-02': 'Feb', '2026-03': 'Mar',
  '2026-04': 'Apr', '2026-05': 'May', '2026-06': 'Jun',
};

function escapeCsv(value: string | number): string {
  const str = String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export default function Reports() {
  const { invoices } = useInvoices();
  const { bills } = useBills();
  const { clients } = useClients();
  const { activityLog } = useActivity();
  const { currency } = useSettings();

  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);

  const handleDownloadCsv = () => {
    const from = dateFrom || '0000-01-01';
    const to = dateTo || '9999-12-31';

    const incomeRows = invoices
      .filter(inv => inv.issueDate >= from && inv.issueDate <= to)
      .map(inv => {
        const client = clients.find(c => c.id === inv.clientId);
        return {
          date: inv.issueDate,
          type: 'Income',
          reference: inv.invoiceNumber,
          party: client?.company || client?.name || '—',
          description: inv.lineItems.map(li => li.description).filter(Boolean).join('; ') || '—',
          status: inv.status,
          amount: inv.total,
        };
      });

    const expenseRows = bills
      .filter(bill => bill.issueDate >= from && bill.issueDate <= to)
      .map(bill => ({
        date: bill.issueDate,
        type: 'Expense',
        reference: bill.billNumber,
        party: bill.vendor,
        description: bill.description || bill.category || '—',
        status: bill.status,
        amount: bill.amount,
      }));

    const rows = [...incomeRows, ...expenseRows].sort((a, b) => a.date.localeCompare(b.date));

    const header = ['Date', 'Type', 'Reference', 'Party', 'Description', 'Status', `Amount (${currency})`];
    const lines = [
      header.map(escapeCsv).join(','),
      ...rows.map(r => [r.date, r.type, r.reference, r.party, r.description, r.status, r.amount.toFixed(2)].map(escapeCsv).join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${from}_to_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const monthlyData = useMemo(() => {
    return MONTHS.map(month => {
      const invoiced = invoices.filter(i => i.issueDate.startsWith(month)).reduce((s, i) => s + i.total, 0);
      const received = invoices.filter(i => i.status === 'paid' && i.paidAt?.startsWith(month)).reduce((s, i) => s + i.total, 0);
      const expenses = bills.filter(b => b.issueDate.startsWith(month)).reduce((s, b) => s + b.amount, 0);
      return { month: MONTH_LABELS[month] || month, Invoiced: invoiced, Received: received, Expenses: expenses };
    });
  }, [invoices, bills]);

  const clientRevenue = useMemo(() => {
    return clients.map(client => {
      const total = invoices.filter(i => i.clientId === client.id && i.status === 'paid').reduce((s, i) => s + i.total, 0);
      return { name: client.company || client.name, Revenue: total };
    }).filter(c => c.Revenue > 0).sort((a, b) => b.Revenue - a.Revenue).slice(0, 6);
  }, [clients, invoices]);

  const statusBreakdown = useMemo(() => {
    const groups = { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 };
    invoices.forEach(i => { groups[i.status] = (groups[i.status] || 0) + i.total; });
    return Object.entries(groups).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })).filter(d => d.value > 0);
  }, [invoices]);

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalExpenses = bills.reduce((s, b) => s + b.amount, 0);
  const netProfit = totalReceived - totalExpenses;

  const PIE_COLORS = ['oklch(42% 0.11 200)', 'oklch(52% 0.15 158)', 'oklch(52% 0.18 22)', 'oklch(62% 0.013 210)', 'oklch(46% 0.019 210)'];

  const activityTypes: Record<string, string> = {
    invoice: '📄',
    client: '👤',
    bill: '🧾',
    payment: '💰',
  };

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Reports</h1>

      {/* CSV Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(42%_0.11_200)]"
            />
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={!dateFrom || !dateTo}
            className="flex items-center gap-2 px-4 py-1.5 bg-[oklch(42%_0.11_200)] hover:bg-[oklch(36%_0.11_200)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <span className="text-xs text-gray-400">Exports all invoices and expenditure within the selected date range</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</div>
            <div className="w-8 h-8 bg-[oklch(92%_0.04_200)] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[oklch(42%_0.11_200)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</div>
          <div className="text-xs text-gray-500 mt-1">{invoices.length} invoices</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue Collected</div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(totalReceived)}</div>
          <div className="text-xs text-gray-500 mt-1">{invoices.filter(i => i.status === 'paid').length} paid invoices</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</div>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-gray-500 mt-1">{bills.length} expenditure items</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Profit</div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <TrendingUp className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(netProfit)}</div>
          <div className="text-xs text-gray-500 mt-1">Revenue - Expenses</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Monthly Revenue vs Expenses */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Monthly Overview</h2>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(93% 0.008 210)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Invoiced" fill="oklch(42% 0.11 200)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Received" fill="oklch(52% 0.15 158)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="oklch(52% 0.18 22)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Invoice Status Breakdown</h2>
          </div>
          <div className="p-4 flex items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {statusBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i] }}></span>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-700">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Client */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Revenue by Client</h2>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(93% 0.008 210)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="Revenue" fill="oklch(42% 0.11 200)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Revenue Trend</h2>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(93% 0.008 210)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Received" stroke="oklch(42% 0.11 200)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Expenses" stroke="oklch(52% 0.18 22)" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Full Activity Log</h2>
        </div>
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No activity yet</div>
          ) : activityLog.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-center gap-3">
              <span className="text-base">{activityTypes[log.type] || '📋'}</span>
              <div>
                <span className="text-xs font-semibold text-gray-500">{format(parseISO(log.date), 'dd MMM yyyy, HH:mm')}</span>
                <span className="text-xs text-gray-500"> — </span>
                <span className="text-xs text-gray-700">{log.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
