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

    // Use service role to fetch data, but verify user_id manually
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
