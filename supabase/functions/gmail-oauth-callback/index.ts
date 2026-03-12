import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // user_id
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(redirectHtml("Erreur d'autorisation Gmail : " + error, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(redirectHtml("Paramètres manquants", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error("Gmail OAuth credentials not configured");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return new Response(redirectHtml("Erreur d'échange de token : " + tokenData.error_description, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Get Gmail profile to store email
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();
    const gmailEmail = profile.emailAddress || null;

    // Store tokens using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabase
      .from("gmail_tokens")
      .upsert({
        host_id: state,
        access_token,
        refresh_token,
        token_expiry: tokenExpiry,
        gmail_email: gmailEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: "host_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(redirectHtml("Erreur de sauvegarde des tokens", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(redirectHtml("Gmail connecté avec succès ! Vous pouvez fermer cette fenêtre.", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    console.error("gmail-oauth-callback error:", e);
    return new Response(redirectHtml("Erreur inattendue", false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHtml(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head><title>Gmail OAuth</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8faff;">
  <div style="text-align:center;padding:2rem;border-radius:12px;background:white;box-shadow:0 2px 12px rgba(0,0,0,0.1);max-width:400px;">
    <div style="font-size:48px;margin-bottom:16px;">${success ? "✅" : "❌"}</div>
    <p style="font-size:16px;color:#333;">${message}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: "gmail-oauth-${success ? "success" : "error"}", message: "${message}" }, "*");
        setTimeout(() => window.close(), 2000);
      }
    </script>
  </div>
</body>
</html>`;
}
