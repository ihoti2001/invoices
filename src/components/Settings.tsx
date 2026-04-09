import { useState, useEffect } from 'react';
import { Save, Building2, Mail, Phone, Globe, CreditCard } from 'lucide-react';
import { supabase } from "@/lib/supabase";

interface BusinessSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  website: string;
  taxId: string;
  defaultTaxRate: number;
  currency: string;
  invoicePrefix: string;
  paymentTerms: string;
  invoiceNotes: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  iban: string;
  senderName: string;
}

const defaultSettings: BusinessSettings = {
  businessName: 'BizFlow Pro',
  email: 'billing@bizflowpro.com',
  phone: '+44 (0) 000 000 0000',
  address: '123 Business Street',
  city: 'London',
  postcode: '',
  country: 'United Kingdom',
  website: 'www.bizflowpro.com',
  taxId: 'TAX-123456789',
  defaultTaxRate: 10,
  currency: 'GBP',
  senderName: 'Ilir Hoti',
  invoicePrefix: 'INV',
  paymentTerms: '30',
  invoiceNotes: 'Thank you for your business! Payment is due within the specified period.',
  bankName: '',
  accountName: '',
  accountNumber: '',
  sortCode: '',
  iban: '',
};

export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("settings").select("data").eq("user_id", user.id).single();
      if (data?.data) setSettings({ ...defaultSettings, ...data.data });
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("settings").upsert({ user_id: user.id, data: settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const update = (key: keyof BusinessSettings, value: string | number) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (loading) {
    return <div className="p-6 text-gray-400 text-sm">Loading settings…</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Business Settings</h1>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <Building2 className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-700 text-sm">Business Information</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                value={settings.businessName}
                onChange={e => update('businessName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
              <input
                type="text"
                value={settings.senderName}
                onChange={e => update('senderName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name (used in email subject and From field)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / ABN</label>
              <input
                value={settings.taxId}
                onChange={e => update('taxId', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={settings.address}
              onChange={e => update('address', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                value={settings.city}
                onChange={e => update('city', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input
                value={settings.postcode}
                onChange={e => update('postcode', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. SW1A 1AA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                value={settings.country}
                onChange={e => update('country', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <Mail className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-700 text-sm">Contact Details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={settings.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={settings.phone}
                  onChange={e => update('phone', e.target.value)}
                  className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={settings.website}
                onChange={e => update('website', e.target.value)}
                className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-700 text-sm">Invoice & Billing Settings</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.currency}
                onChange={e => update('currency', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="EUR">EUR — Euro</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.defaultTaxRate}
                onChange={e => update('defaultTaxRate', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
              <input
                type="number"
                min={0}
                value={settings.paymentTerms}
                onChange={e => update('paymentTerms', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
              <input
                value={settings.invoicePrefix}
                onChange={e => update('invoicePrefix', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Invoice Notes</label>
            <textarea
              value={settings.invoiceNotes}
              onChange={e => update('invoiceNotes', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
        <p className="text-sm text-gray-500 mb-4">These details appear at the bottom of every invoice.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["bankName", "accountName", "accountNumber", "sortCode"] as (keyof BusinessSettings)[]).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field === "bankName" ? "Bank Name" : field === "accountName" ? "Account Name" : field === "accountNumber" ? "Account Number" : "Sort Code"}
              </label>
              <input
                value={settings[field] as string}
                onChange={(e) => update(field, e.target.value)}
                placeholder={field === "sortCode" ? "e.g. 20-00-00" : ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN <span className="text-gray-400">(optional, for international clients)</span></label>
            <input
              value={settings.iban}
              onChange={(e) => update("iban", e.target.value)}
              placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
