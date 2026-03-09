import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = Deno.env.get("INBOUND_EMAIL_WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    // Extract fields from Resend Inbound payload
    const fromEmail = payload.from || "";
    const fromName = payload.from_name || fromEmail.split("@")[0] || "";
    const toEmail = payload.to || "";
    const subject = payload.subject || "(Sans objet)";
    const bodyHtml = payload.html || null;
    const bodyText = payload.text || null;
    const attachments = payload.attachments || [];

    // Determine target email (handle array or string)
    const targetEmail = Array.isArray(toEmail) ? toEmail[0] : toEmail;

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find host by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", targetEmail)
      .single();

    if (profileError || !profile) {
      console.error("Host not found for email:", targetEmail, profileError);
      // Still return 200 to prevent Resend from retrying
      return new Response(
        JSON.stringify({ message: "Host not found, email discarded" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert email into inbox_emails
    const { error: insertError } = await supabase
      .from("inbox_emails")
      .insert({
        host_id: profile.id,
        from_email: fromEmail,
        from_name: fromName,
        to_email: targetEmail,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        attachments: attachments,
        read: false,
        received_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error inserting email:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Email received successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
