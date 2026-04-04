import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      hostId,
      listingTitle,
      checkinDate,
      checkoutDate,
      nights,
      price,
      guestName,
      guestEmail,
      guestPhone,
      guestMessage,
    } = await req.json();

    // Basic validation
    if (!hostId || !listingTitle || !checkinDate || !checkoutDate || !guestName || !guestEmail || !guestPhone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(guestEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input length limits
    if (guestName.length > 100 || guestEmail.length > 255 || guestPhone.length > 30 || (guestMessage && guestMessage.length > 2000)) {
      return new Response(JSON.stringify({ error: "Input too long" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get host email from portal_settings first, fallback to profiles
    let hostEmail: string | null = null;

    const { data: portalSettings } = await supabase
      .from('portal_settings')
      .select('contact_email')
      .eq('host_user_id', hostId)
      .maybeSingle();

    if (portalSettings?.contact_email) {
      hostEmail = portalSettings.contact_email;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', hostId)
        .maybeSingle();
      hostEmail = profile?.email || null;
    }

    if (!hostEmail) {
      return new Response(JSON.stringify({ error: "Host email not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Escape HTML
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const priceText = price != null
      ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price)}`
      : 'Sur demande';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 4px 0; color: #1a1a2e; font-size: 18px;">🏠 Nouvelle demande de réservation</h2>
    <p style="margin: 0; color: #666; font-size: 14px;">${esc(listingTitle)}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px; width: 140px;">📅 Arrivée</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px;">${esc(checkinDate)}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">📅 Départ</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px;">${esc(checkoutDate)}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">🌙 Nuits</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px;">${nights}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">💰 Tarif affiché</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px; color: #16a34a;">${priceText}</td>
    </tr>
  </table>

  <div style="background: #f0f7ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1a1a2e;">👤 Coordonnées du demandeur</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #666; font-size: 13px; width: 100px;">Nom</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 500;">${esc(guestName)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666; font-size: 13px;">Email</td>
        <td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${esc(guestEmail)}" style="color: #2563eb;">${esc(guestEmail)}</a></td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666; font-size: 13px;">Téléphone</td>
        <td style="padding: 6px 0; font-size: 14px;"><a href="tel:${esc(guestPhone)}" style="color: #2563eb;">${esc(guestPhone)}</a></td>
      </tr>
    </table>
  </div>

  ${guestMessage ? `
  <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a2e;">💬 Message</h3>
    <p style="margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${esc(guestMessage)}</p>
  </div>
  ` : ''}

  <p style="color: #999; font-size: 11px; text-align: center; margin-top: 30px;">
    Cette demande a été envoyée depuis le simulateur de disponibilité.
  </p>
</body>
</html>`;

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendWithFrom = async (from: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [hostEmail],
          reply_to: guestEmail,
          subject: `Nouvelle demande de réservation - ${listingTitle}`,
          html: htmlBody,
        }),
      });

      const responseText = await response.text();
      return { ok: response.ok, text: responseText, from };
    };

    let resendResult = await sendWithFrom('Castellamare <noreply@castellamare.com>');

    if (!resendResult.ok) {
      const looksLikeUnverifiedDomain = resendResult.text.toLowerCase().includes('domain is not verified');
      if (looksLikeUnverifiedDomain) {
        console.warn('Primary sender domain not verified, retrying with Resend sandbox sender');
        resendResult = await sendWithFrom('Castellamare <onboarding@resend.dev>');
      }
    }

    if (!resendResult.ok) {
      console.error('Resend error:', resendResult.text);
      let userMessage = "Échec de l'envoi de l'e-mail";
      const lowerText = resendResult.text.toLowerCase();
      if (lowerText.includes('testing emails are only allowed')) {
        userMessage = "Le service d'e-mail est en mode test et n'autorise que l'adresse propriétaire du compte.";
      }
      return new Response(JSON.stringify({
        error: userMessage,
        details: resendResult.text,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
