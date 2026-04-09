# Phase 3: Invoice Email Sending — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the "Send to Client" button to send a real HTML invoice email via Resend, triggered by a Supabase Edge Function.

**Architecture:** Clicking "Send to Client" calls `sendInvoice(id, email)` in AppContext, which invokes a Supabase Edge Function. The Edge Function fetches invoice/client/settings from Supabase, builds an HTML email, and POSTs to Resend. The Resend API key lives as a Supabase secret — never in the browser.

**Tech Stack:** React 19, TypeScript, Supabase Edge Functions (Deno), Resend email API, @supabase/supabase-js

---

### Task 1: Resend account + domain verification + Supabase CLI setup

**Files:** None — user action only.

- [ ] **Step 1: Create a Resend account**

Go to [https://resend.com](https://resend.com) and sign up. Free tier allows 3,000 emails/month.

- [ ] **Step 2: Add and verify your domain in Resend**

In the Resend dashboard:
1. Go to **Domains** → **Add Domain**
2. Enter `etikauk.com`
3. Resend will show you 3 DNS records to add (2 × TXT, 1 × MX)
4. In Cloudflare, go to your `etikauk.com` zone → **DNS** → **Add record** for each one
5. Back in Resend, click **Verify** — Cloudflare propagates instantly so it should pass within seconds

- [ ] **Step 3: Get your Resend API key**

In Resend dashboard → **API Keys** → **Create API Key**. Give it a name like `invoices-app`. Copy the key — it starts with `re_`.

- [ ] **Step 4: Install the Supabase CLI**

```bash
npm install -g supabase
```

Verify:
```bash
supabase --version
```
Expected: prints a version number like `1.x.x`.

- [ ] **Step 5: Log in to Supabase CLI**

```bash
supabase login
```

This opens a browser tab — click **Allow**.

- [ ] **Step 6: Link to your Supabase project**

```bash
cd "/Users/ilir/Desktop/invoices app" && supabase link --project-ref aiiaihcjdvffeblsghbg
```

Expected: `Linked to project aiiaihcjdvffeblsghbg`

- [ ] **Step 7: Store your Resend API key as a Supabase secret**

```bash
supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
```

Replace `re_YOUR_KEY_HERE` with your actual key. Expected: `Finished updating secrets`.

---

### Task 2: Add senderName field to Settings

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/Settings.tsx` to see the current `BusinessSettings` interface and `defaultSettings` constant.

- [ ] **Step 2: Add senderName to the BusinessSettings interface**

In the `interface BusinessSettings` block, add after the last existing field:

```typescript
  senderName: string;
```

- [ ] **Step 3: Add senderName to defaultSettings**

In the `defaultSettings` object, add after `currency: 'GBP'`:

```typescript
  senderName: 'Ilir Hoti',
```

- [ ] **Step 4: Add the Sender Name input field in the JSX**

Find the Business Information section in the JSX (look for the `businessName` input). Add a "Sender Name" field immediately after it:

```tsx
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
```

- [ ] **Step 5: Run build check**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: zero TypeScript errors, `✓ built`.

- [ ] **Step 6: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/Settings.tsx && git commit -m "feat: add senderName field to Settings"
```

---

### Task 3: Create Supabase Edge Function send-invoice

**Files:**
- Create: `supabase/functions/send-invoice/index.ts`

- [ ] **Step 1: Create the functions directory**

```bash
mkdir -p "/Users/ilir/Desktop/invoices app/supabase/functions/send-invoice"
```

- [ ] **Step 2: Create supabase/functions/send-invoice/index.ts**

Create the file with this exact content:

```typescript
// supabase/functions/send-invoice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify the caller's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoiceId, recipientEmail } = await req.json();
    if (!invoiceId || !recipientEmail) {
      return new Response(JSON.stringify({ error: "invoiceId and recipientEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch data (bypasses RLS), but verify user_id manually
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const [invoiceRes, lineItemsRes, settingsRes] = await Promise.all([
      admin
        .from("invoices")
        .select("*, clients(*)")
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .single(),
      admin.from("invoice_line_items").select("*").eq("invoice_id", invoiceId),
      admin.from("settings").select("data").eq("user_id", user.id).single(),
    ]);

    if (invoiceRes.error || !invoiceRes.data) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice = invoiceRes.data;
    const client = invoice.clients as Record<string, string> | null;
    const lineItems = (lineItemsRes.data ?? []) as Record<string, unknown>[];
    const settings = (settingsRes.data?.data ?? {}) as Record<string, string>;

    const senderName = settings.senderName || "Ilir Hoti";
    const fromEmail = "ilir@etikauk.com";
    const businessName = settings.businessName || senderName;
    const businessAddress = [settings.address, settings.city, settings.country]
      .filter(Boolean)
      .join(", ");

    const fmt = (amount: number) =>
      amount.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 });

    const toDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const lineItemsHTML = lineItems
      .map(
        (li) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px">${li.description}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;font-size:14px">${li.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;color:#6b7280;font-size:14px">${fmt(Number(li.rate))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#111827;font-size:14px">${fmt(Number(li.amount))}</td>
      </tr>`
      )
      .join("");

    const paymentHTML =
      settings.bankName || settings.accountNumber || settings.sortCode
        ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">Payment Details</p>
        ${settings.bankName ? `<p style="margin:3px 0;font-size:14px;color:#6b7280"><strong style="color:#374151">Bank:</strong> ${settings.bankName}</p>` : ""}
        ${settings.accountName ? `<p style="margin:3px 0;font-size:14px;color:#6b7280"><strong style="color:#374151">Account Name:</strong> ${settings.accountName}</p>` : ""}
        ${settings.accountNumber ? `<p style="margin:3px 0;font-size:14px;color:#6b7280"><strong style="color:#374151">Account Number:</strong> ${settings.accountNumber}</p>` : ""}
        ${settings.sortCode ? `<p style="margin:3px 0;font-size:14px;color:#6b7280"><strong style="color:#374151">Sort Code:</strong> ${settings.sortCode}</p>` : ""}
        ${settings.iban ? `<p style="margin:3px 0;font-size:14px;color:#6b7280"><strong style="color:#374151">IBAN:</strong> ${settings.iban}</p>` : ""}
      </div>`
        : "";

    const notesHTML = invoice.notes
      ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Notes</p>
        <p style="font-size:14px;color:#6b7280;margin:0">${invoice.notes}</p>
      </div>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden">

    <div style="background:#1d4ed8;padding:32px 40px">
      <p style="margin:0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">INVOICE</p>
      <p style="margin:6px 0 0;font-size:16px;color:#93c5fd;font-weight:500">${invoice.invoice_number}</p>
    </div>

    <div style="padding:36px 40px">

      <table style="width:100%;margin-bottom:32px;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;width:50%">
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">From</p>
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 3px">${businessName}</p>
            <p style="font-size:13px;color:#6b7280;margin:0 0 2px">${fromEmail}</p>
            ${businessAddress ? `<p style="font-size:13px;color:#6b7280;margin:0">${businessAddress}</p>` : ""}
          </td>
          <td style="vertical-align:top;width:50%;padding-left:32px">
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">Bill To</p>
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 3px">${client?.company || client?.name || "Client"}</p>
            ${client?.company ? `<p style="font-size:13px;color:#6b7280;margin:0 0 2px">${client.name}</p>` : ""}
            <p style="font-size:13px;color:#6b7280;margin:0 0 2px">${client?.email || ""}</p>
            ${client?.address ? `<p style="font-size:13px;color:#6b7280;margin:0">${client.address}${client.city ? ", " + client.city : ""}</p>` : ""}
          </td>
        </tr>
      </table>

      <table style="width:100%;margin-bottom:32px;border-collapse:collapse">
        <tr>
          <td style="width:50%">
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Issue Date</p>
            <p style="font-size:14px;color:#374151;font-weight:500;margin:0">${toDate(invoice.issue_date)}</p>
          </td>
          <td style="width:50%;padding-left:32px">
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Due Date</p>
            <p style="font-size:14px;color:#374151;font-weight:500;margin:0">${toDate(invoice.due_date)}</p>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb">
            <th style="text-align:left;padding:8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Description</th>
            <th style="text-align:center;padding:8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:50px">Qty</th>
            <th style="text-align:right;padding:8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:90px">Rate</th>
            <th style="text-align:right;padding:8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:90px">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsHTML}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end">
        <table style="width:240px;border-collapse:collapse">
          <tr>
            <td style="padding:5px 8px;font-size:14px;color:#6b7280">Subtotal</td>
            <td style="padding:5px 8px;font-size:14px;color:#374151;text-align:right">${fmt(Number(invoice.subtotal))}</td>
          </tr>
          <tr>
            <td style="padding:5px 8px;font-size:14px;color:#6b7280">Tax (${invoice.tax_rate}%)</td>
            <td style="padding:5px 8px;font-size:14px;color:#374151;text-align:right">${fmt(Number(invoice.tax_amount))}</td>
          </tr>
          <tr style="border-top:2px solid #e5e7eb">
            <td style="padding:10px 8px;font-size:17px;font-weight:800;color:#111827">Total</td>
            <td style="padding:10px 8px;font-size:17px;font-weight:800;color:#1d4ed8;text-align:right">${fmt(Number(invoice.total))}</td>
          </tr>
        </table>
      </div>

      ${notesHTML}
      ${paymentHTML}

    </div>

    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Sent by ${senderName} &middot; ${fromEmail}</p>
    </div>

  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: [recipientEmail],
        reply_to: fromEmail,
        subject: `Invoice ${invoice.invoice_number} from ${senderName}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text();
      return new Response(JSON.stringify({ error: `Resend API error: ${body}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 3: Deploy the Edge Function**

```bash
cd "/Users/ilir/Desktop/invoices app" && supabase functions deploy send-invoice
```

Expected output: `Deployed Function send-invoice` with a URL.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add supabase/functions/send-invoice/index.ts && git commit -m "feat: add send-invoice Edge Function"
```

---

### Task 4: Update AppContext — sendInvoice calls Edge Function

**Files:**
- Modify: `src/store/AppContext.tsx`
- Modify: `src/store/useInvoices.ts`

- [ ] **Step 1: Read AppContext.tsx**

Read `src/store/AppContext.tsx`. Find the `AppStore` interface and the `sendInvoice` function.

- [ ] **Step 2: Update AppStore interface**

In the `AppStore` interface, change:

```typescript
sendInvoice: (id: string) => Promise<void>;
```

to:

```typescript
sendInvoice: (id: string, recipientEmail: string) => Promise<void>;
```

- [ ] **Step 3: Replace the sendInvoice implementation**

Find the `sendInvoice` function in `AppProvider` and replace it with:

```typescript
const sendInvoice = async (id: string, recipientEmail: string): Promise<void> => {
  const { error } = await supabase.functions.invoke("send-invoice", {
    body: { invoiceId: id, recipientEmail },
  });
  if (error) throw error;
  await updateInvoice(id, { status: "sent" });
  const inv = invoices.find((i) => i.id === id);
  if (inv) await addActivityEntry(`Invoice ${inv.invoiceNumber} sent to ${recipientEmail}`, "invoice");
};
```

- [ ] **Step 4: Read src/store/useInvoices.ts**

Read `src/store/useInvoices.ts`.

- [ ] **Step 5: Update useInvoices.ts**

The `sendInvoice` is passed through from `useAppContext()` — its new signature is automatically reflected. Verify the file destructures and returns `sendInvoice` as-is. No change needed if it already does `return { ..., sendInvoice, ... }`.

- [ ] **Step 6: Run build check**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: zero TypeScript errors. If you see an error about `sendInvoice` arguments, check that the AppStore interface and implementation both use `(id: string, recipientEmail: string)`.

- [ ] **Step 7: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/store/AppContext.tsx src/store/useInvoices.ts && git commit -m "feat: sendInvoice calls Edge Function with recipientEmail"
```

---

### Task 5: Update InvoiceView — one-click send with inline feedback

**Files:**
- Modify: `src/components/InvoiceView.tsx`

The current file has a `showSendModal` state and a full send modal with To/Subject/Message fields. Replace this with a one-click button that shows a spinner while sending and "Sent ✓" on success.

- [ ] **Step 1: Read InvoiceView.tsx**

Read `src/components/InvoiceView.tsx` to see the current state declarations, `handleSendInvoice`, and the send modal JSX.

- [ ] **Step 2: Update the onSend prop type**

Find the `InvoiceViewProps` interface (or inline props type). Change the `onSend` type from:

```typescript
onSend: (id: string) => void;
```

to:

```typescript
onSend: (id: string, email: string) => Promise<void>;
```

- [ ] **Step 3: Replace send-related state**

Remove these state declarations:
```typescript
const [showSendModal, setShowSendModal] = useState(false);
const [sendEmail, setSendEmail] = useState(client?.email || '');
const [sendMessage, setSendMessage] = useState(`...`);
const [sent, setSent] = useState(false);
```

Add these instead:
```typescript
const [sending, setSending] = useState(false);
const [sendError, setSendError] = useState('');
const [sendSuccess, setSendSuccess] = useState(false);
```

- [ ] **Step 4: Replace handleSendInvoice**

Remove the old `handleSendInvoice` function. Add:

```typescript
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
```

- [ ] **Step 5: Replace the Send to Client button**

Find the "Send to Client" button in the header. Replace it with:

```tsx
{(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
  <div className="flex flex-col items-end gap-1">
    <button
      onClick={handleSend}
      disabled={sending || !client?.email}
      title={!client?.email ? 'No email on file for this client' : undefined}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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
```

- [ ] **Step 6: Remove the entire send modal JSX**

Delete the `{showSendModal && (...)}` block at the bottom of the component (the full modal with To/Subject/Message fields). It runs from `{/* Send Invoice Modal */}` to the closing `)}`.

- [ ] **Step 7: Run build check**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: zero TypeScript errors. Common issues:
- If TypeScript complains about `onSend` prop type mismatch, check `InvoiceViewProps` was updated correctly
- If `Send` icon is missing, it's already imported from lucide-react — check the import at the top of the file

- [ ] **Step 8: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/components/InvoiceView.tsx && git commit -m "feat: InvoiceView one-click send with spinner feedback"
```

---

### Task 6: Update App.tsx — pass email to sendInvoice

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read App.tsx**

Read `src/App.tsx` to find `handleSendFromView` and how `onSend` is passed to `InvoiceView`.

- [ ] **Step 2: Update handleSendFromView**

Find `handleSendFromView`. It currently calls `store.sendInvoice(id)`. 

Replace the entire function with:

```typescript
const handleSendFromView = async (id: string, email: string) => {
  await store.sendInvoice(id, email);
};
```

(The invoice status update and modal refresh are no longer needed here — `sendInvoice` in AppContext handles the status update, and InvoiceView's own state handles the UI feedback.)

- [ ] **Step 3: Run build check**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 4: Run tests**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm test
```

Expected: format.ts tests pass (3), AppContext tests skipped (1).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add src/App.tsx && git commit -m "feat: App.tsx passes email to sendInvoice"
```

---

### Task 7: Final verification

- [ ] **Step 1: Ensure Edge Function is deployed**

```bash
cd "/Users/ilir/Desktop/invoices app" && supabase functions list
```

Expected: `send-invoice` appears with status `ACTIVE`.

If not deployed yet:
```bash
supabase functions deploy send-invoice
```

- [ ] **Step 2: Start dev server**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run dev
```

Open http://localhost:5173

- [ ] **Step 3: Test the send flow**

1. Log in with your Supabase credentials
2. Go to **Invoices** → open any invoice that has a client with an email address
3. Click **Send to Client** — the button should show a spinner for 1-3 seconds
4. On success: button shows "Sent ✓", invoice status changes to `sent`
5. Check the client's inbox — the invoice email should arrive within seconds

- [ ] **Step 4: Test the no-email guard**

Open an invoice where the client has no email address. The "Send to Client" button should be greyed out and show a tooltip "No email on file for this client" on hover.

- [ ] **Step 5: Test Settings senderName**

Go to **Settings**, update the Sender Name field, save. Send another invoice. Verify the email subject and From name reflect the updated name.

- [ ] **Step 6: Build for production**

```bash
cd "/Users/ilir/Desktop/invoices app" && npm run build
```

Expected: `✓ built`, zero TypeScript errors.

- [ ] **Step 7: Final commit**

```bash
cd "/Users/ilir/Desktop/invoices app" && git add -A && git commit -m "feat: Phase 3 complete — real invoice email sending via Resend"
```

---

*Phase 3 complete. Invoices are now delivered to clients by email. The Resend API key lives as a Supabase secret. The sender name and business details are configurable in Settings.*
