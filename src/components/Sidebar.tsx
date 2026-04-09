import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Settings,
  BarChart3,
  HelpCircle,
  ChevronDown,
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
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'settings', label: 'Business Settings', icon: Settings },
] as const;

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 min-h-screen bg-[#1a2236] flex flex-col text-white flex-shrink-0">
      {/* Top user area */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-2 transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#2e4a7a] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
            BZ
          </div>
          <span className="text-sm font-semibold text-white/90 truncate">BizFlow Pro</span>
          <ChevronDown className="w-4 h-4 text-white/50 ml-auto flex-shrink-0" />
        </div>
      </div>

      {/* Avatar */}
      <div className="flex justify-center pt-6 pb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg">
          BZ
        </div>
      </div>

      {/* Upgrade button */}
      <div className="px-4 pb-4">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
          Upgrade
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === id
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white/90'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors">
          <HelpCircle className="w-4 h-4" />
          Help Center
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full mt-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
