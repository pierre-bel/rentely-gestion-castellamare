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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBeforeOrSameDay(a: Date, b: Date): boolean {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDay <= bDay;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization: accept x-cron-secret header OR valid supabase auth
  const cronSecret = req.headers.get('x-cron-secret');
  const envCronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('authorization');
  
  // Accept cron secret, or valid JWT from authenticated user (for instant triggers)
  const isCronAuthorized = 
    cronSecret === 'internal-cron-call' ||
    (envCronSecret && cronSecret === envCronSecret);
  
  const hasAuthHeader = authHeader?.startsWith('Bearer ');
  
  if (!isCronAuthorized && !hasAuthHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  // Parse optional body for instant trigger mode
  let instantBookingId: string | null = null;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      instantBookingId = body?.booking_id || null;
    } catch { /* no body or invalid JSON, that's fine for cron calls */ }
  }

  try {
    console.log('Starting process-email-automations...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Cutoff: don't send emails for bookings whose checkout is more than 14 days in the past
    const cutoffDate = addDays(today, -14);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // 1. Get all enabled automations
    const { data: automations, error: autoErr } = await supabase
      .from('email_automations')
      .select('*')
      .eq('is_enabled', true);

    if (autoErr) throw autoErr;
    if (!automations || automations.length === 0) {
      console.log('No enabled automations found');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get active bookings (confirmed, completed but not too old, pre_reservation)
    let bookingsQuery = supabase
      .from('bookings')
      .select('id, checkin_date, checkout_date, nights, guests, total_price, guest_user_id, listing_id, pricing_breakdown, igloohome_code, status, access_token')
      .in('status', ['confirmed', 'completed', 'pre_reservation', 'pending_payment']);

    if (instantBookingId) {
      bookingsQuery = bookingsQuery.eq('id', instantBookingId);
    } else {
      bookingsQuery = bookingsQuery.gte('checkout_date', cutoffStr);
    }

    const { data: bookings, error: bookErr } = await bookingsQuery;

    if (bookErr) throw bookErr;
    if (!bookings || bookings.length === 0) {
      console.log('No eligible bookings found');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get all sent email logs to avoid duplicates
    const bookingIds = bookings.map(b => b.id);
    const { data: sentLogs } = await supabase
      .from('email_send_log')
      .select('automation_id, booking_id')
      .in('booking_id', bookingIds)
      .not('automation_id', 'is', null);

    const sentSet = new Set(
      (sentLogs || []).map(l => `${l.automation_id}::${l.booking_id}`)
    );

    // 4. Get listings for host_user_id mapping
    const listingIds = [...new Set(bookings.map(b => b.listing_id))];
    const { data: listings } = await supabase
      .from('listings')
      .select('id, host_user_id, title, address, city, country')
      .in('id', listingIds);

    const listingMap = new Map((listings || []).map(l => [l.id, l]));

    let sentCount = 0;

    for (const booking of bookings) {
      const checkin = new Date(booking.checkin_date + 'T00:00:00');
      const checkout = new Date(booking.checkout_date + 'T00:00:00');
      const listing = listingMap.get(booking.listing_id);
      if (!listing) continue;

      for (const auto of automations) {
        // Check if automation belongs to this listing's host
        if (auto.host_user_id !== listing.host_user_id) continue;

        // Check listing targeting
        const targets = auto.listing_ids as string[] | null;
        if (targets && targets.length > 0 && !targets.includes(booking.listing_id)) continue;

        // Skip if already sent
        const key = `${auto.id}::${booking.id}`;
        if (sentSet.has(key)) continue;

        // Calculate scheduled date
        let scheduledDate: Date | null = null;
        if (auto.trigger_type === 'booking_confirmed') {
          if (!instantBookingId) {
            // Skip in cron mode — only process in instant mode
            continue;
          }
          // In instant mode, treat as due now
          scheduledDate = today;
        } else if (instantBookingId) {
          // In instant mode, only process booking_confirmed triggers
          continue;
        } else if (auto.trigger_type === 'days_before_checkin') {
          scheduledDate = addDays(checkin, -auto.trigger_days);
        } else if (auto.trigger_type === 'day_of_checkin') {
          scheduledDate = checkin;
        } else if (auto.trigger_type === 'days_after_checkin') {
          scheduledDate = addDays(checkin, auto.trigger_days);
        } else if (auto.trigger_type === 'days_before_checkout') {
          scheduledDate = addDays(checkout, -auto.trigger_days);
        } else if (auto.trigger_type === 'day_of_checkout') {
          scheduledDate = checkout;
        } else if (auto.trigger_type === 'days_after_checkout') {
          scheduledDate = addDays(checkout, auto.trigger_days);
        } else if (auto.trigger_type === 'payment_reminder') {
          continue; // Handled separately
        }

        if (!scheduledDate) continue;

        // Check if it's time to send
        const isDue = isBeforeOrSameDay(scheduledDate, today);
        if (!isDue) continue;

        // Check send_if_late: if the scheduled date is in the past (before today) and send_if_late is false, skip
        const isLate = scheduledDate < today && !isSameDay(scheduledDate, today);
        if (isLate && !auto.send_if_late) continue;

        // Build variables
        try {
          const variables = await buildVariablesForBooking(supabase, booking, listing);

          // Determine recipient
          let recipientEmail: string;
          if (auto.recipient_type === 'fixed' && auto.recipient_email) {
            recipientEmail = auto.recipient_email;
          } else if (auto.recipient_type === 'host' && auto.recipient_email) {
            recipientEmail = auto.recipient_email;
          } else if (auto.recipient_type === 'host') {
            const { data: hostProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', listing.host_user_id)
              .single();
            recipientEmail = hostProfile?.email || '';
          } else {
            recipientEmail = variables.guest_email;
          }

          if (!recipientEmail) {
            console.log(`No recipient for automation ${auto.id} / booking ${booking.id}`);
            continue;
          }

          const processedSubject = replacePlaceholders(auto.subject, variables);
          const processedBody = replacePlaceholders(auto.body_html, variables);

          const emailPayload: Record<string, unknown> = {
            from: 'Rentely <onboarding@resend.dev>',
            to: [recipientEmail],
            subject: processedSubject,
            html: processedBody,
          };
          if (auto.reply_to_email) {
            emailPayload.reply_to = auto.reply_to_email;
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

          await supabase.from('email_send_log').insert({
            automation_id: auto.id,
            booking_id: booking.id,
            recipient_email: recipientEmail,
            subject: processedSubject,
            status: resendRes.ok ? 'sent' : 'failed',
            resend_id: resendData.id || null,
            error_message: resendRes.ok ? null : JSON.stringify(resendData),
          });

          if (resendRes.ok) {
            sentCount++;
            console.log(`Sent: ${auto.name} → ${recipientEmail} (booking ${booking.id})`);
          } else {
            console.error(`Failed: ${auto.name} → ${recipientEmail}: ${JSON.stringify(resendData)}`);
          }

          // Mark as sent in our set to avoid duplicates within this run
          sentSet.add(key);
        } catch (err) {
          console.error(`Error processing automation ${auto.id} for booking ${booking.id}:`, err);
        }
      }
    }

    console.log(`process-email-automations completed. Sent ${sentCount} emails.`);
    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in process-email-automations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildVariablesForBooking(
  supabase: any,
  booking: any,
  listing: any,
): Promise<Record<string, string>> {
  const pricingBreakdown = booking.pricing_breakdown as Record<string, unknown> | null;
  const tenantId = pricingBreakdown?.tenant_id as string | undefined;

  let tenantFirstName = '';
  let tenantLastName = '';
  let tenantEmail = '';
  let tenantGender: string | null = null;

  if (tenantId) {
    const { data: tenant } = await supabase
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

  // Fetch payment info
  const { data: paymentItems } = await supabase
    .from('booking_payment_items')
    .select('label, amount, is_paid, due_date')
    .eq('booking_id', booking.id)
    .order('sort_order', { ascending: true });

  let paymentAmount = '';
  let paymentLabel = '';
  let paymentDueDate = '';
  let depositAmount = '';
  let depositDueDate = '';
  let balanceAmount = '';
  let balanceDueDate = '';

  // Use booking-specific times, fall back to listing defaults
  let checkinTime = '';
  let checkoutTime = '';
  if (booking.checkin_time) {
    checkinTime = booking.checkin_time;
  }
  if (booking.checkout_time) {
    checkoutTime = booking.checkout_time;
  }
  if (!checkinTime || !checkoutTime) {
    const { data: fullListing } = await supabase
      .from('listings')
      .select('checkin_from, checkout_until')
      .eq('id', booking.listing_id)
      .single();
    if (fullListing) {
      if (!checkinTime) checkinTime = fullListing.checkin_from || '';
      if (!checkoutTime) checkoutTime = fullListing.checkout_until || '';
    }
  }

  // Bank QR info
  let qrPaiementHtml = '';
  const { data: bankSettings } = await supabase
    .from('portal_settings')
    .select('bank_beneficiary_name, bank_iban, bank_bic, bank_transfer_reference_template')
    .eq('host_user_id', listing.host_user_id)
    .maybeSingle();

  if (bankSettings?.bank_beneficiary_name && bankSettings?.bank_iban && bankSettings?.bank_bic) {
    const refTemplate = bankSettings.bank_transfer_reference_template || '{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}';
    let ref = refTemplate;
    const refVars: Record<string, string> = {
      guest_last_name: tenantLastName,
      guest_full_name: `${tenantFirstName} ${tenantLastName}`.trim(),
      listing_title: listing.title || '',
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
    };
    for (const [k, v] of Object.entries(refVars)) {
      ref = ref.split(`{{${k}}}`).join(v);
    }
    ref = ref.substring(0, 140);

    qrPaiementHtml = `<div style="text-align:center;margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb"><p style="font-size:13px;color:#374151;margin:0 0 8px">💳 Paiement par virement SEPA</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>Bénéficiaire :</strong> ${bankSettings.bank_beneficiary_name}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>IBAN :</strong> ${bankSettings.bank_iban}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>BIC :</strong> ${bankSettings.bank_bic}</p><p style="font-size:12px;color:#6b7280;margin:0 0 4px"><strong>Montant :</strong> ${Number(booking.total_price).toFixed(2)} €</p><p style="font-size:12px;color:#6b7280;margin:0"><strong>Communication :</strong> ${ref}</p></div>`;
  }

  // Next unpaid payment
  const nextUnpaid = (paymentItems || []).find((p: any) => !p.is_paid);
  if (nextUnpaid) {
    paymentAmount = `${Number(nextUnpaid.amount).toFixed(2)} €`;
  }

  return {
    guest_first_name: tenantFirstName,
    guest_last_name: tenantLastName,
    guest_full_name: `${tenantFirstName} ${tenantLastName}`.trim(),
    guest_email: tenantEmail,
    guest_civility: getCivility(tenantGender),
    checkin_date: booking.checkin_date,
    checkout_date: booking.checkout_date,
    checkin_time: checkinTime,
    checkout_time: checkoutTime,
    nights: String(booking.nights),
    guests_count: String(booking.guests),
    total_price: booking.total_price ? `${Number(booking.total_price).toFixed(2)} €` : '',
    listing_title: listing.title || '',
    listing_address: listing.address || '',
    listing_city: listing.city || '',
    listing_country: listing.country || '',
    booking_id: booking.id,
    igloohome_code: booking.igloohome_code || '',
    payment_amount: paymentAmount,
    qr_paiement: qrPaiementHtml,
    portal_link: `https://gestioncastellamare.lovable.app/booking/${booking.access_token || ''}`,
  };
}
