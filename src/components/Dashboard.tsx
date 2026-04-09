import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle, Users, Activity } from 'lucide-react';
import AddNewMenu from './AddNewMenu';
import { format, parseISO } from 'date-fns';
import { Client, Invoice, Bill, ActivityLog } from '../types';

interface DashboardProps {
  clients: Client[];
  invoices: Invoice[];
  bills: Bill[];
  activityLog: ActivityLog[];
  onNavigate: (page: string) => void;
  onAddNew: () => void;
  onNewClient: () => void;
  onNewBill: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function Dashboard({ clients, invoices, bills, activityLog, onNavigate, onAddNew, onNewClient, onNewBill }: DashboardProps) {
  const stats = useMemo(() => {
    const outstanding = invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const overdue = invoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const collectedThisYear = invoices
      .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt).getFullYear() === 2026)
      .reduce((sum, i) => sum + i.total, 0);

    return { outstanding, overdue, collectedThisYear, clientCount: clients.length };
  }, [clients, invoices]);

  // Monthly bar chart data
  const barData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    return months.map(month => {
      const invoiced = invoices
        .filter(i => i.issueDate.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      const received = invoices
        .filter(i => i.status === 'paid' && i.paidAt && i.paidAt.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      return { month, Invoiced: invoiced, Received: received };
    });
  }, [invoices]);

  // Pie chart data
  const pieData = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const sent = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const draft = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total, 0);
    return [
      { name: 'Received', value: paid, color: '#22c55e' },
      { name: 'Sent', value: sent, color: '#3b82f6' },
      { name: 'Overdue', value: overdue, color: '#ef4444' },
      { name: 'Draft', value: draft, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [invoices]);

  // Line chart data (invoiced vs expenses by month)
  const lineData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    return months.map(month => {
      const invoiced = invoices
        .filter(i => i.issueDate.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      const expenses = bills
        .filter(b => b.issueDate.startsWith(month))
        .reduce((sum, b) => sum + b.amount, 0);
      return { month, Invoiced: invoiced, Expenses: expenses };
    });
  }, [invoices, bills]);

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'payment': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'invoice': return <FileTextIcon />;
      case 'client': return <Users className="w-3 h-3 text-blue-400" />;
      default: return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow"
        >
          + Add New
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Recent Activity</h2>
            <button onClick={() => onNavigate('reports')} className="text-blue-600 text-xs hover:underline">View Activity Log</button>
          </div>
          <div className="divide-y divide-gray-50">
            {activityLog.slice(0, 5).map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <span className="mt-0.5">{getActivityIcon(log.type)}</span>
                <div>
                  <span className="text-xs font-semibold text-gray-500">
                    {format(parseISO(log.date), 'dd MMM yyyy')}
                  </span>
                  <span className="text-xs text-gray-500"> — </span>
                  <span className="text-xs text-gray-700">{log.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At a Glance */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">At a Glance</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                Total Outstanding:
              </div>
              <span className="font-semibold text-gray-800 text-sm">{formatCurrency(stats.outstanding)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Total Overdue:
              </div>
              <span className="font-semibold text-red-600 text-sm">{formatCurrency(stats.overdue)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Total Collected this Year:
              </div>
              <span className="font-semibold text-green-700 text-sm">{formatCurrency(stats.collectedThisYear)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                Clients:
              </div>
              <span className="font-semibold text-gray-800 text-sm">{stats.clientCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Invoiced / Received (Jan 2026 – Apr 2026)</h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Invoice Summary Pie */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Invoice Summary</h2>
            <span className="text-xs text-gray-400">01 Jan 2026 – 01 Jan 2027</span>
          </div>
          <div className="p-5 flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-1 rounded bg-blue-500 inline-block"></span><span className="text-gray-600">Invoiced</span></div>
                <span className="font-semibold text-gray-800">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-1 rounded bg-green-500 inline-block"></span><span className="text-gray-600">Received</span></div>
                <span className="font-semibold text-gray-800">{formatCurrency(totalReceived)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-1 rounded bg-red-500 inline-block"></span><span className="text-gray-600">Overdue</span></div>
                <span className="font-semibold text-gray-800">{formatCurrency(stats.overdue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-1 rounded bg-slate-400 inline-block"></span><span className="text-gray-600">Draft</span></div>
                <span className="font-semibold text-gray-800">{formatCurrency(invoices.filter(i=>i.status==='draft').reduce((s,i)=>s+i.total,0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Invoiced / Expenses</h2>
            <span className="text-xs text-gray-400">01 Jan 2026 – 01 Jan 2027</span>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Invoiced" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
