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
  };
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

      // Build variables from real booking or use provided sample
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

      // Determine recipient
      let recipientEmail: string;
      if (automation.recipient_type === 'fixed' && automation.recipient_email) {
        recipientEmail = automation.recipient_email;
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
