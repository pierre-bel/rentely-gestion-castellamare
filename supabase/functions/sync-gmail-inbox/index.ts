import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: gmailToken, error: tokenErr } = await serviceClient
      .from("gmail_tokens")
      .select("*")
      .eq("host_id", userId)
      .single();

    if (tokenErr || !gmailToken) {
      return new Response(JSON.stringify({ error: "Gmail non connecté" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh access token if expired
    let accessToken = gmailToken.access_token;
    if (new Date(gmailToken.token_expiry) <= new Date()) {
      const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
      const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");

      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GMAIL_CLIENT_ID!,
          client_secret: GMAIL_CLIENT_SECRET!,
          refresh_token: gmailToken.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshRes.json();
      if (refreshData.error) {
        console.error("Token refresh error:", refreshData);
        return new Response(JSON.stringify({ error: "Erreur de rafraîchissement du token Gmail. Reconnectez Gmail." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

      await serviceClient
        .from("gmail_tokens")
        .update({
          access_token: accessToken,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("host_id", userId);
    }

    const gmailHeaders = { Authorization: `Bearer ${accessToken}` };

    let messageIds: string[] = [];

    if (gmailToken.last_history_id) {
      try {
        const historyRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${gmailToken.last_history_id}&historyTypes=messageAdded&labelId=INBOX`,
          { headers: gmailHeaders }
        );
        const historyData = await historyRes.json();

        if (historyData.history) {
          for (const h of historyData.history) {
            if (h.messagesAdded) {
              for (const m of h.messagesAdded) {
                messageIds.push(m.message.id);
              }
            }
          }
        }

        if (historyData.historyId) {
          await serviceClient
            .from("gmail_tokens")
            .update({
              last_history_id: historyData.historyId,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("host_id", userId);
        }
      } catch (e) {
        console.error("History API error, falling back to list:", e);
        messageIds = await fetchRecentMessageIds(gmailHeaders);
      }
    } else {
      messageIds = await fetchRecentMessageIds(gmailHeaders);
    }

    if (messageIds.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "Aucun nouveau message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await serviceClient
      .from("inbox_emails")
      .select("gmail_message_id")
      .eq("host_id", userId)
      .in("gmail_message_id", messageIds);

    const existingIds = new Set((existing || []).map((e: any) => e.gmail_message_id));
    const newMessageIds = messageIds.filter((id) => !existingIds.has(id));

    let synced = 0;
    let skipped = 0;

    for (const msgId of newMessageIds.slice(0, 20)) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: gmailHeaders }
        );
        const msgData = await msgRes.json();

        // Skip draft, sent, or chat messages
        const labels: string[] = msgData.labelIds || [];
        if (labels.includes("DRAFT") || labels.includes("SENT") || labels.includes("CHAT")) {
          skipped++;
          continue;
        }

        const headers = msgData.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || null;

        const fromRaw = getHeader("From") || "";
        const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, "").trim() : null;
        const fromEmail = fromMatch ? fromMatch[2] : fromRaw;

        const toEmail = getHeader("To");
        const subject = getHeader("Subject");
        const dateStr = getHeader("Date");
        const receivedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

        const { textBody, htmlBody } = extractBody(msgData.payload);

        // Skip emails with no meaningful content
        if (!textBody && !htmlBody && !subject) {
          skipped++;
          continue;
        }

        const attachments = extractAttachments(msgData.payload);

        const { error: insertErr } = await serviceClient
          .from("inbox_emails")
          .insert({
            host_id: userId,
            from_email: fromEmail,
            from_name: fromName,
            to_email: toEmail,
            subject,
            body_text: textBody,
            body_html: htmlBody,
            attachments: attachments.length > 0 ? attachments : null,
            gmail_message_id: msgId,
            received_at: receivedAt,
            read: false,
            status: "new",
          });

        if (insertErr) {
          console.error(`Insert error for msg ${msgId}:`, insertErr);
        } else {
          synced++;
        }
      } catch (e) {
        console.error(`Error processing message ${msgId}:`, e);
      }
    }

    // Update history ID
    try {
      const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: gmailHeaders,
      });
      const profile = await profileRes.json();
      if (profile.historyId) {
        await serviceClient
          .from("gmail_tokens")
          .update({
            last_history_id: profile.historyId,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("host_id", userId);
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }

    return new Response(JSON.stringify({ synced, skipped, message: `${synced} email(s) synchronisé(s)${skipped > 0 ? `, ${skipped} ignoré(s)` : ''}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-gmail-inbox error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchRecentMessageIds(headers: Record<string, string>): Promise<string[]> {
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30&labelIds=INBOX&q=is:inbox",
    { headers }
  );
  const listData = await listRes.json();
  return (listData.messages || []).map((m: any) => m.id);
}

function extractBody(payload: any): { textBody: string | null; htmlBody: string | null } {
  let textBody: string | null = null;
  let htmlBody: string | null = null;

  if (!payload) return { textBody, htmlBody };

  function decodeBase64Utf8(base64: string): string {
    const binary = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  }

  function processPartBody(part: any) {
    const mimeType = part.mimeType || "";
    if (part.body?.data) {
      const decoded = decodeBase64Utf8(part.body.data);
      if (mimeType === "text/plain" && !textBody) textBody = decoded;
      if (mimeType === "text/html" && !htmlBody) htmlBody = decoded;
    }
    if (part.parts) {
      for (const sub of part.parts) processPartBody(sub);
    }
  }

  processPartBody(payload);
  return { textBody, htmlBody };
}

function extractAttachments(payload: any): any[] {
  const attachments: any[] = [];

  function scan(part: any) {
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body?.size || 0,
      });
    }
    if (part.parts) {
      for (const sub of part.parts) scan(sub);
    }
  }

  if (payload) scan(payload);
  return attachments;
}
