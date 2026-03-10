import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function replacePlaceholders(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || '');
  }
  return result;
}

function getCivility(gender: string | null): string {
  if (gender === 'male' || gender === 'homme') return 'Monsieur';
  if (gender === 'female' || gender === 'femme') return 'Madame';
  return '';
}

async function buildVariablesFromBooking(supabase: any, bookingId: string): Promise<Record<string, string>> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, checkin_date, checkout_date, nights, guests, total_price, guest_user_id, listing_id, pricing_breakdown')
    .eq('id', bookingId)
    .single();

  if (!booking) throw new Error('Booking not found');

  const { data: listing } = await supabase
    .from('listings')
    .select('title, address, city, country')
    .eq('id', booking.listing_id)
    .single();

  const pricingBreakdown = booking.pricing_breakdown as Record<string, unknown> | null;
  const tenantId = pricingBreakdown?.tenant_id as string | undefined;

  let tenantFirstName = '';
  let tenantLastName = '';
  let tenantEmail = '';
  let tenantGender: string | null = null;

  if (tenantId) {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('first_name, last_name, email, gender')
      .eq('id', tenantId)
      .single();
    if (tenant) {
      tenantFirstName = tenant.first_name || '';
      tenantLastName = tenant.last_name || '';
      tenantEmail = tenant.email || '';
      tenantGender = tenant.gender;
    }
  }

  if (!tenantFirstName) {
    const { data: guest } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', booking.guest_user_id)
      .single();
    if (guest) {
      tenantFirstName = guest.first_name || '';
      tenantLastName = guest.last_name || '';
      tenantEmail = tenantEmail || guest.email || '';
    }
  }

  // Fetch host's bank settings for QR generation
  const listingHostId = listing ? (await supabase.from('listings').select('host_user_id').eq('id', booking.listing_id).single()).data?.host_user_id : null;
  let qrPaiementHtml = '';
  if (listingHostId) {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: bankSettings } = await serviceClient
      .from('portal_settings')
      .select('bank_beneficiary_name, bank_iban, bank_bic, bank_transfer_reference_template')
      .eq('host_user_id', listingHostId)
      .maybeSingle();

    if (bankSettings?.bank_beneficiary_name && bankSettings?.bank_iban && bankSettings?.bank_bic) {
      const refTemplate = bankSettings.bank_transfer_reference_template || '{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}';
      // Build reference from template
      let ref = refTemplate;
      const refVars: Record<string, string> = {
        guest_last_name: tenantLastName || '',
        guest_full_name: `${tenantFirstName} ${tenantLastName}`.trim(),
        listing_title: listing?.title || '',
        checkin_date: booking.checkin_date,
        checkout_date: booking.checkout_date,
      };
      for (const [k, v] of Object.entries(refVars)) {
        ref = ref.split(`{{${k}}}`).join(v);
      }
      ref = ref.substring(0, 140);

      // Build EPC string and generate QR as base64
      const epcLines = [
        'BCD', '002', '1', 'SCT',
        bankSettings.bank_bic.replace(/\s/g, '').toUpperCase(),
        bankSettings.bank_beneficiary_name.substring(0, 70),
        bankSettings.bank_iban.replace(/\s/g, '').toUpperCase(),
        `EUR${Number(booking.total_price).toFixed(2)}`,
        '', '', ref,
      ];
      const epcString = epcLines.join('\n');
      
      // Use a simple QR generation approach for edge functions
      // We'll embed the EPC data as text since we can't use canvas in Deno
      qrPaiementHtml = `<div style="text-align:center;margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb"><p style="font-size:13px;color:#374151;margin:0 0 8px">💳 Paiement par virement SEPA</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>Bénéficiaire :</strong> ${bankSettings.bank_beneficiary_name}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>IBAN :</strong> ${bankSettings.bank_iban}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>BIC :</strong> ${bankSettings.bank_bic}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>Montant :</strong> ${Number(booking.total_price).toFixed(2)} €</p><p style="font-size:12px;color:#6b7280;margin:0"><strong>Communication :</strong> ${ref}</p></div>`;
    }
  }

  return {
    guest_first_name: tenantFirstName,
    guest_last_name: tenantLastName,
    guest_full_name: `${tenantFirstName} ${tenantLastName}`.trim(),
    guest_email: tenantEmail,
    guest_civility: getCivility(tenantGender),
    checkin_date: booking.checkin_date,
    checkout_date: booking.checkout_date,
    nights: String(booking.nights),
    guests_count: String(booking.guests),
    total_price: booking.total_price ? `${Number(booking.total_price).toFixed(2)} €` : '',
    listing_title: listing?.title || '',
    listing_address: listing?.address || '',
    listing_city: listing?.city || '',
    listing_country: listing?.country || '',
    booking_id: booking.id,
    qr_paiement: qrPaiementHtml,
    portal_link: `https://gestioncastellamare.lovable.app/booking/${booking.access_token}`,
  };
}

function buildReminderHtml(variables: Record<string, string>, paymentLabel: string, paymentAmount: number, dueDate: string): string {
  const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const guestName = variables.guest_full_name || 'Locataire';
  const civility = variables.guest_civility;
  const greeting = civility ? `${civility} ${variables.guest_last_name || guestName}` : guestName;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #dc2626; margin: 0 0 8px;">⚠️ Rappel de paiement</h2>
      <p style="color: #991b1b; margin: 0;">Un paiement est en retard pour votre réservation.</p>
    </div>
    
    <p style="color: #374151; font-size: 16px;">Bonjour ${greeting},</p>
    
    <p style="color: #374151; font-size: 15px;">
      Nous vous rappelons que le paiement suivant pour votre séjour à <strong>${variables.listing_title}</strong> est en retard :
    </p>
    
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Échéance</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${paymentLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Montant</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 18px;">${paymentAmount.toFixed(2)} €</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date d'échéance</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #dc2626;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Séjour</td>
          <td style="padding: 6px 0; text-align: right; color: #111827;">${variables.checkin_date} → ${variables.checkout_date}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #374151; font-size: 15px;">
      Merci de procéder au règlement dans les meilleurs délais. Si le paiement a déjà été effectué, veuillez ne pas tenir compte de ce rappel.
    </p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
      Cordialement,<br>
      L'équipe de gestion
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action } = body;

    if (action === 'test') {
      const { subject, body_html, test_email, variables, reply_to_email, booking_id } = body;

      let finalVariables: Record<string, string>;
      if (booking_id) {
        finalVariables = await buildVariablesFromBooking(supabase, booking_id);
      } else {
        finalVariables = variables || {};
      }

      const processedSubject = replacePlaceholders(subject, finalVariables);
      const processedBody = replacePlaceholders(body_html, finalVariables);

      const emailPayload: Record<string, unknown> = {
        from: 'Rentely <onboarding@resend.dev>',
        to: [test_email],
        subject: processedSubject,
        html: processedBody,
      };
      if (reply_to_email) {
        emailPayload.reply_to = reply_to_email;
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(`Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
      }

      return new Response(JSON.stringify({ success: true, resend_id: resendData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'send_for_booking') {
      const { automation_id, booking_id } = body;

      const { data: automation, error: autoError } = await supabase
        .from('email_automations')
        .select('*')
        .eq('id', automation_id)
        .eq('host_user_id', userId)
        .single();

      if (autoError || !automation) {
        throw new Error('Automation not found');
      }

      const variables = await buildVariablesFromBooking(supabase, booking_id);

      let recipientEmail: string;
      if (automation.recipient_type === 'fixed' && automation.recipient_email) {
        recipientEmail = automation.recipient_email;
      } else if (automation.recipient_type === 'host' && automation.recipient_email) {
        recipientEmail = automation.recipient_email;
      } else if (automation.recipient_type === 'host') {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        recipientEmail = hostProfile?.email || '';
        if (!recipientEmail) throw new Error('Host email not found');
      } else {
        recipientEmail = variables.guest_email;
        if (!recipientEmail) throw new Error('Recipient email not found');
      }

      const processedSubject = replacePlaceholders(automation.subject, variables);
      const processedBody = replacePlaceholders(automation.body_html, variables);

      const emailPayload: Record<string, unknown> = {
        from: 'Rentely <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: processedSubject,
        html: processedBody,
      };
      if (automation.reply_to_email) {
        emailPayload.reply_to = automation.reply_to_email;
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const resendData = await resendRes.json();

      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await serviceClient.from('email_send_log').insert({
        automation_id: automation.id,
        booking_id: booking_id,
        recipient_email: recipientEmail,
        subject: processedSubject,
        status: resendRes.ok ? 'sent' : 'failed',
        resend_id: resendData.id || null,
        error_message: resendRes.ok ? null : JSON.stringify(resendData),
      });

      if (!resendRes.ok) {
        throw new Error(`Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
      }

      return new Response(JSON.stringify({ success: true, resend_id: resendData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'send_reminder') {
      const { booking_id, payment_label, payment_amount, due_date } = body;

      // Verify the host owns this booking
      const { data: bookingCheck, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, listing_id, listings!inner(host_user_id)')
        .eq('id', booking_id)
        .single();

      if (bookingErr || !bookingCheck) {
        throw new Error('Booking not found or access denied');
      }

      const variables = await buildVariablesFromBooking(supabase, booking_id);
      const recipientEmail = variables.guest_email;
      if (!recipientEmail) throw new Error('Recipient email not found');

      const reminderSubject = `Rappel de paiement – ${payment_label} – ${variables.listing_title}`;
      const reminderHtml = buildReminderHtml(variables, payment_label, payment_amount, due_date);

      // Get host reply-to email
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const emailPayload: Record<string, unknown> = {
        from: 'Rentely <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: reminderSubject,
        html: reminderHtml,
      };
      if (hostProfile?.email) {
        emailPayload.reply_to = hostProfile.email;
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const resendData = await resendRes.json();

      // Log the reminder email
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await serviceClient.from('email_send_log').insert({
        booking_id: booking_id,
        recipient_email: recipientEmail,
        subject: reminderSubject,
        status: resendRes.ok ? 'sent' : 'failed',
        resend_id: resendData.id || null,
        error_message: resendRes.ok ? null : JSON.stringify(resendData),
      });

      if (!resendRes.ok) {
        throw new Error(`Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
      }

      return new Response(JSON.stringify({ success: true, resend_id: resendData.id, sent_to: recipientEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in send-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
