export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type BillStatus = 'pending' | 'paid' | 'overdue';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  company: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdAt: string;
  paidAt?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  vendor: string;
  category: string;
  status: BillStatus;
  issueDate: string;
  dueDate: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  description: string;
  type: 'invoice' | 'client' | 'bill' | 'payment';
}
