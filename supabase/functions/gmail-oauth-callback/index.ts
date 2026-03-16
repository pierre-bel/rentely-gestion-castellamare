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
  const escapedMessage = message.replace(/'/g, "\\'").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion Gmail</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#f0fdf4 0%,#f8faff 100%);">
  <div style="text-align:center;padding:2.5rem;border-radius:16px;background:white;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:420px;width:90%;">
    <div style="width:64px;height:64px;border-radius:50%;background:${success ? '#dcfce7' : '#fee2e2'};display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
      <span style="font-size:32px;">${success ? '✅' : '❌'}</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">${success ? 'Connexion réussie !' : 'Échec de la connexion'}</h2>
    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.5;">${message}</p>
    ${success ? '<p style="font-size:13px;color:#999;">Cette fenêtre va se fermer automatiquement…</p>' : ''}
    <button onclick="window.close()" style="margin-top:16px;padding:10px 24px;border:1px solid #ddd;border-radius:8px;background:#f9fafb;color:#333;font-size:14px;cursor:pointer;">Fermer cette fenêtre</button>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage({ type: '${success ? 'gmail-oauth-success' : 'gmail-oauth-error'}', message: '${escapedMessage}' }, '*');
          ${success ? 'setTimeout(function() { window.close(); }, 3000);' : ''}
        }
      } catch(e) {}
    </script>
  </div>
</body>
</html>`;
}
