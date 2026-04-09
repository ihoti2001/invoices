import { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Users, Receipt } from 'lucide-react';

interface AddNewMenuProps {
  onNewInvoice: () => void;
  onNewClient: () => void;
  onNewBill: () => void;
}

export default function AddNewMenu({ onNewInvoice, onNewClient, onNewBill }: AddNewMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'New Invoice', icon: FileText, action: onNewInvoice },
    { label: 'New Client', icon: Users, action: onNewClient },
    { label: 'New Bill', icon: Receipt, action: onNewBill },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow"
      >
        <Plus className="w-4 h-4" />
        Add New
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
