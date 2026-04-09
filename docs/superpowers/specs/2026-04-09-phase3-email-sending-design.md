# Phase 3: Invoice Email Sending — Design Spec

## Goal

When the user clicks "Send to Client" on an invoice, the client receives a real email with full invoice details. No review modal — one-click fires immediately.

## Architecture

The frontend calls a Supabase Edge Function (`send-invoice`) with the invoice ID and recipient email. The Edge Function fetches all required data from Supabase (invoice, line items, client, business settings), builds an HTML email, and delivers it via Resend. On success the frontend marks the invoice as `sent` and logs an activity entry.

The Resend API key is stored as a Supabase secret — never exposed in the browser.

```
InvoiceView (click)
  → AppContext.sendInvoice(id, recipientEmail)
    → POST supabase/functions/send-invoice { invoiceId, recipientEmail }
      → fetch invoice + line items + client + settings from Supabase
      → build HTML email
      → Resend API → client inbox
    ← { ok: true }
  → updateInvoice(id, { status: "sent" })
  → addActivityEntry(...)
```

## User Setup (one-time, before implementation)

1. **Resend account** — sign up at resend.com (free tier: 3,000 emails/month)
2. **Domain verification** — Resend → Domains → Add domain → enter `etikauk.com` → add the 3 DNS records in Cloudflare (takes ~2 minutes, propagates in seconds on Cloudflare)
3. **Supabase CLI** — `npm install -g supabase` then `supabase login`
4. **Link project** — `supabase link --project-ref aiiaihcjdvffeblsghbg`
5. **Store API key** — `supabase secrets set RESEND_API_KEY=re_your_key_here`

## Files

| File | Change |
|------|--------|
| `supabase/functions/send-invoice/index.ts` | New — Edge Function |
| `src/components/Settings.tsx` | Add `senderName` field (default: `Ilir Hoti`) |
| `src/store/AppContext.tsx` | `sendInvoice` async, takes `recipientEmail`, calls Edge Function |
| `src/components/InvoiceView.tsx` | Remove send modal, one-click button with spinner + "Sent ✓" |
| `src/App.tsx` | Update `onSend` handler signature to `(id, email) => Promise<void>` |

## Edge Function: send-invoice

**Runtime:** Deno (Supabase Edge Functions default)

**Request:** `POST` with JSON body `{ invoiceId: string, recipientEmail: string }`

**Auth:** Validates the Supabase JWT from the `Authorization` header — only authenticated users can trigger sends.

**Logic:**
1. Verify JWT, extract `user_id`
2. Fetch from Supabase (service role client):
   - `invoices` row matching `invoiceId` and `user_id`
   - `invoice_line_items` for that invoice
   - `clients` row for `client_id`
   - `settings` row for `user_id`
3. Build HTML email string
4. POST to `https://api.resend.com/emails` with:
   - `from`: `{senderName} <ilir@etikauk.com>` (senderName from settings, fallback `Ilir Hoti`)
   - `to`: `[recipientEmail]`
   - `reply_to`: `ilir@etikauk.com`
   - `subject`: `Invoice {invoiceNumber} from {senderName}`
   - `html`: full invoice HTML
5. Return `{ ok: true }` on success, `{ error: string }` on failure

**Secrets used:** `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase)

## Email Content

The HTML email contains:

- Header: sender name + `ilir@etikauk.com`
- "Bill To" block: client company/name, email, phone, address
- Invoice metadata: invoice number, issue date, due date, status
- Line items table: description, qty, rate (£), amount (£)
- Totals: subtotal, tax (%), total in GBP (£)
- Notes section (if present)
- Payment details section (bank, account name, account number, sort code, IBAN) if set in Settings
- Plain white background, table layout, inline CSS for email client compatibility

## Settings Changes

Add `senderName: string` to the `BusinessSettings` interface with default `'Ilir Hoti'`. Add a "Sender Name" input field in the Settings UI (Business Information section). This value is stored in the Supabase `settings` JSONB blob alongside existing fields.

## AppContext Changes

`sendInvoice` signature changes from `(id: string) => Promise<void>` to `(id: string, recipientEmail: string) => Promise<void>`.

New flow:
```typescript
const sendInvoice = async (id: string, recipientEmail: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke("send-invoice", {
    body: { invoiceId: id, recipientEmail },
  });
  if (error) throw error;
  await updateInvoice(id, { status: "sent" });
  const inv = invoices.find(i => i.id === id);
  const client = clients.find(c => c.id === inv?.clientId);
  await addActivityEntry(`Invoice ${inv?.invoiceNumber} sent to ${recipientEmail}`, "invoice");
};
```

## InvoiceView Changes

Remove the `showSendModal` state and entire send modal JSX. Replace with:

- "Send to Client" button now calls `onSend(invoice.id, client?.email ?? '')` directly
- Button shows a spinner while sending (`sending` state)
- On success, button briefly shows "Sent ✓" then returns to normal
- On error, shows a small red error message below the button
- `onSend` prop type: `(id: string, email: string) => Promise<void>`

## AppStore Interface Change

```typescript
sendInvoice: (id: string, recipientEmail: string) => Promise<void>;
```

## Error Handling

- If `client.email` is empty, the button is disabled with tooltip "No email on file for this client"
- If the Edge Function returns an error, show it inline in the invoice header (red banner, dismissible)
- Network errors are caught and displayed the same way

## Deployment

Edge Functions are deployed with:
```bash
supabase functions deploy send-invoice
```

No build step needed — Supabase compiles and hosts Deno functions automatically.

## Out of Scope

- PDF attachment (would require a headless browser or PDF library in the Edge Function)
- Email open/read tracking
- Scheduled sending or reminders
- Multiple recipients per invoice
