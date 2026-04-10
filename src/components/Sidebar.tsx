import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Settings,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { supabase } from "@/lib/supabase";

type Page = 'dashboard' | 'invoices' | 'bills' | 'clients' | 'reports' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports',   label: 'Reports',   icon: BarChart3 },
  { id: 'invoices',  label: 'Invoices',  icon: FileText },
  { id: 'bills',     label: 'Expenditure', icon: Receipt },
  { id: 'clients',   label: 'Clients',   icon: Users },
  { id: 'settings',  label: 'Settings',  icon: Settings },
] as const;

const SB_BG          = 'oklch(17% 0.026 215)';
const SB_ACTIVE_BG   = 'oklch(99% 0.004 210)';
const SB_ACTIVE_TEXT = 'oklch(17% 0.026 215)';
const SB_MUTED       = 'oklch(52% 0.018 210)';
const SB_HOVER_BG    = 'oklch(24% 0.022 215)';
const SB_HOVER_TEXT  = 'oklch(82% 0.012 210)';
const SB_DIVIDER     = 'oklch(27% 0.022 215)';
const SB_ACCENT      = 'oklch(52% 0.055 200)';

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside
      style={{ background: SB_BG, fontFamily: '"Hanken Grotesk", sans-serif' }}
      className="w-52 min-h-screen flex flex-col flex-shrink-0"
    >
      {/* Wordmark */}
      <div className="px-5 pt-7 pb-8">
        <p
          style={{ color: 'oklch(94% 0.006 210)', fontFamily: '"Bricolage Grotesque", sans-serif' }}
          className="text-sm font-semibold leading-snug"
        >
          Ilir Hoti
        </p>
        <p
          style={{ color: SB_ACCENT, letterSpacing: '0.12em', fontSize: '10px' }}
          className="uppercase font-medium mt-0.5"
        >
          Web Design
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id as Page)}
              style={{
                background: active ? SB_ACTIVE_BG : 'transparent',
                color: active ? SB_ACTIVE_TEXT : SB_MUTED,
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = SB_HOVER_BG;
                  (e.currentTarget as HTMLElement).style.color = SB_HOVER_TEXT;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = SB_MUTED;
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Icon
                className="flex-shrink-0"
                style={{ width: 15, height: 15 }}
                strokeWidth={active ? 2 : 1.5}
              />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-3 pb-5 pt-3"
        style={{ borderTop: `1px solid ${SB_DIVIDER}` }}
      >
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ color: SB_MUTED }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'oklch(62% 0.18 22)';
            (e.currentTarget as HTMLElement).style.background = 'oklch(22% 0.025 215)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = SB_MUTED;
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg w-full transition-colors"
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
