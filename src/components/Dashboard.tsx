import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { CheckCircle, Users, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ActivityLog } from '../types';
import { useInvoices } from '@/store/useInvoices';
import { useClients } from '@/store/useClients';
import { useBills } from '@/store/useBills';
import { useActivity } from '@/store/useActivity';

interface DashboardProps {
  onNavigate: (page: string) => void;
  onAddInvoice: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

const ACCENT      = 'oklch(42% 0.11 200)';
const SUCCESS     = 'oklch(52% 0.15 158)';
const DANGER      = 'oklch(52% 0.18 22)';
const TEXT_1      = 'oklch(15% 0.013 210)';
const TEXT_2      = 'oklch(46% 0.019 210)';
const TEXT_3      = 'oklch(62% 0.013 210)';
const SURFACE     = 'oklch(99.5% 0.003 210)';
const BORDER      = 'oklch(87% 0.015 210)';
const DIVIDER     = 'oklch(92% 0.01 210)';
const CHART_GRID  = 'oklch(93% 0.008 210)';

const DISPLAY_FONT = '"Bricolage Grotesque", sans-serif';

export default function Dashboard({ onNavigate, onAddInvoice }: DashboardProps) {
  const { invoices } = useInvoices();
  const { clients } = useClients();
  const { bills } = useBills();
  const { activityLog } = useActivity();

  const stats = useMemo(() => {
    const outstanding = invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);
    const overdue = invoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);
    const collectedThisYear = invoices
      .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt).getFullYear() === new Date().getFullYear())
      .reduce((sum, i) => sum + i.total, 0);
    return { outstanding, overdue, collectedThisYear, clientCount: clients.length };
  }, [clients, invoices]);

  const barData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    return months.map(month => {
      const invoiced = invoices
        .filter(i => i.issueDate.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      const received = invoices
        .filter(i => i.status === 'paid' && i.paidAt && i.paidAt.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      return { month: month.slice(5), Invoiced: invoiced, Received: received };
    });
  }, [invoices]);

  const pieData = useMemo(() => {
    const paid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const sent    = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const draft   = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total, 0);
    return [
      { name: 'Received', value: paid,    color: SUCCESS },
      { name: 'Sent',     value: sent,    color: ACCENT },
      { name: 'Overdue',  value: overdue, color: DANGER },
      { name: 'Draft',    value: draft,   color: TEXT_3 },
    ].filter(d => d.value > 0);
  }, [invoices]);

  const lineData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    return months.map(month => {
      const invoiced = invoices
        .filter(i => i.issueDate.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      const expenses = bills
        .filter(b => b.issueDate.startsWith(month))
        .reduce((sum, b) => sum + b.amount, 0);
      return { month: month.slice(5), Invoiced: invoiced, Expenses: expenses };
    });
  }, [invoices, bills]);

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const draftTotal    = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total, 0);

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'payment': return <CheckCircle style={{ width: 12, height: 12, color: SUCCESS }} />;
      case 'client':  return <Users style={{ width: 12, height: 12, color: ACCENT }} />;
      default:        return <Activity style={{ width: 12, height: 12, color: TEXT_3 }} />;
    }
  };

  const cardStyle = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: '12px',
    overflow: 'hidden' as const,
  };

  const cardHeadStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 14px',
  };

  const cardDivider = { borderTop: `1px solid ${DIVIDER}` };

  return (
    <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: DISPLAY_FONT, color: TEXT_1, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          Dashboard
        </h1>
        <button
          onClick={onAddInvoice}
          style={{ background: ACCENT, color: '#fff', fontFamily: '"Hanken Grotesk", sans-serif', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          + New Invoice
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        {[
          { label: 'Outstanding',   value: formatCurrency(stats.outstanding),       color: TEXT_1 },
          { label: 'Overdue',       value: formatCurrency(stats.overdue),            color: DANGER },
          { label: 'Collected YTD', value: formatCurrency(stats.collectedThisYear),  color: ACCENT },
          { label: 'Clients',       value: String(stats.clientCount),                color: TEXT_1 },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{ padding: '20px 24px', borderLeft: i > 0 ? `1px solid ${BORDER}` : undefined }}
          >
            <p style={{ color: TEXT_3, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px', margin: '0 0 8px' }}>
              {stat.label}
            </p>
            <p style={{ fontFamily: DISPLAY_FONT, color: stat.color, fontSize: '22px', fontWeight: 600, lineHeight: 1, margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Top row: Bar chart + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Bar chart */}
        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <p style={{ fontFamily: DISPLAY_FONT, color: TEXT_1, fontSize: '13px', fontWeight: 600, margin: 0 }}>Invoiced / Received</p>
            <span style={{ color: TEXT_3, fontSize: '11px' }}>Jan – Apr 2026</span>
          </div>
          <div style={{ ...cardDivider, padding: '16px 20px 20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: TEXT_3 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_3 }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Invoiced" fill={ACCENT}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="Received" fill={SUCCESS} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <p style={{ fontFamily: DISPLAY_FONT, color: TEXT_1, fontSize: '13px', fontWeight: 600, margin: 0 }}>Recent Activity</p>
            <button
              onClick={() => onNavigate('reports')}
              style={{ color: ACCENT, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              View all →
            </button>
          </div>
          <div style={cardDivider}>
            {(activityLog ?? []).slice(0, 5).map((log, i) => (
              <div
                key={log.id}
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: i < 4 ? `1px solid ${DIVIDER}` : undefined }}
              >
                <span style={{ marginTop: 2, flexShrink: 0 }}>{getActivityIcon(log.type)}</span>
                <div>
                  <span style={{ color: TEXT_3, fontSize: '11px', fontWeight: 500 }}>
                    {format(parseISO(log.date), 'dd MMM yyyy')}
                  </span>
                  <span style={{ color: TEXT_3, fontSize: '11px' }}> — </span>
                  <span style={{ color: TEXT_2, fontSize: '11px' }}>{log.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Pie + Line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Invoice Summary */}
        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <p style={{ fontFamily: DISPLAY_FONT, color: TEXT_1, fontSize: '13px', fontWeight: 600, margin: 0 }}>Invoice Summary</p>
            <span style={{ color: TEXT_3, fontSize: '11px' }}>2026</span>
          </div>
          <div style={{ ...cardDivider, padding: '20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { color: ACCENT,  label: 'Invoiced', value: formatCurrency(totalInvoiced) },
                { color: SUCCESS, label: 'Received', value: formatCurrency(totalReceived) },
                { color: DANGER,  label: 'Overdue',  value: formatCurrency(stats.overdue) },
                { color: TEXT_3,  label: 'Draft',    value: formatCurrency(draftTotal) },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: TEXT_2, fontSize: '12px' }}>{item.label}</span>
                  </div>
                  <span style={{ color: TEXT_1, fontSize: '12px', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line chart */}
        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <p style={{ fontFamily: DISPLAY_FONT, color: TEXT_1, fontSize: '13px', fontWeight: 600, margin: 0 }}>Revenue vs Expenses</p>
            <span style={{ color: TEXT_3, fontSize: '11px' }}>2026</span>
          </div>
          <div style={{ ...cardDivider, padding: '16px 20px 20px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: TEXT_3 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_3 }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Invoiced" stroke={ACCENT}  strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Expenses" stroke={DANGER}  strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
