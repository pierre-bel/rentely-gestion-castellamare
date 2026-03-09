import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invitation_id } = await req.json();
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: "invitation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch invitation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("host_team_invitations")
      .select("*")
      .eq("id", invitation_id)
      .eq("host_user_id", user.id)
      .single();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get host profile
    const { data: hostProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    const hostName = hostProfile
      ? [hostProfile.first_name, hostProfile.last_name].filter(Boolean).join(" ") || hostProfile.email
      : user.email;

    const accessLabels: Record<string, string> = {
      full_access: "Accès complet",
      read_only: "Lecture seule",
      read_only_anonymous: "Lecture anonyme",
      accounting_only: "Comptabilité uniquement",
    };

    const accessLabel = accessLabels[invitation.access_level] || invitation.access_level;
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app`;
    const acceptUrl = `${siteUrl}/accept-invitation?token=${invitation.token}`;

    // Skip email for demo accounts
    const demoEmails = ["guest@demo.com", "host@demo.com", "admin@demo.com"];
    if (demoEmails.includes(invitation.email.toLowerCase())) {
      console.log("Skipping email for demo account:", invitation.email);
      return new Response(JSON.stringify({ success: true, skipped: "demo_account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend if API key is available
    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Rentely <onboarding@resend.dev>",
          to: [invitation.email],
          subject: `${hostName} vous invite à collaborer sur Rentely`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a;">Invitation à collaborer</h2>
              <p style="color: #555; line-height: 1.6;">
                <strong>${hostName}</strong> vous invite à accéder à ses données de gestion locative sur Rentely 
                avec le niveau d'accès <strong>${accessLabel}</strong>.
              </p>
              <div style="margin: 30px 0;">
                <a href="${acceptUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Accepter l'invitation
                </a>
              </div>
              <p style="color: #888; font-size: 13px; line-height: 1.5;">
                Cette invitation expire dans 7 jours. Si vous n'avez pas encore de compte, 
                vous devrez d'abord en créer un avec l'adresse e-mail ${invitation.email}.
              </p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }
    } else {
      console.log("RESEND_API_KEY not configured. Invitation created but email not sent.");
      console.log("Accept URL:", acceptUrl);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
