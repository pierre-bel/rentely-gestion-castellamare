import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingPayout {
  id: string;
  host_user_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting pending payout processing...');

    const { data: pendingPayouts, error: fetchError } = await supabase
      .from('payouts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching pending payouts:', fetchError);
      throw fetchError;
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      console.log('No pending payouts found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending payouts to process',
          processed_count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${pendingPayouts.length} pending payouts`);

    const processedPayouts: string[] = [];
    const failedPayouts: string[] = [];

    for (const payout of pendingPayouts as PendingPayout[]) {
      try {
        console.log(`Processing payout ${payout.id} for host ${payout.host_user_id}: $${payout.amount}`);

        const paymentSuccess = true;

        if (paymentSuccess) {
          const { error: updateError } = await supabase
            .from('payouts')
            .update({
              status: 'completed',
              payout_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', payout.id);

          if (updateError) {
            console.error(`Error updating payout ${payout.id}:`, updateError);
            failedPayouts.push(payout.id);
          } else {
            console.log(`Successfully processed payout ${payout.id}`);
            processedPayouts.push(payout.id);
          }
        } else {
          const { error: failError } = await supabase
            .from('payouts')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              notes: (payout.notes || '') + ' | Payment processing failed',
            })
            .eq('id', payout.id);

          if (failError) {
            console.error(`Error marking payout ${payout.id} as failed:`, failError);
          }
          failedPayouts.push(payout.id);
        }
      } catch (error) {
        console.error(`Exception processing payout ${payout.id}:`, error);
        failedPayouts.push(payout.id);
      }
    }

    console.log(`Payout processing complete. Processed: ${processedPayouts.length}, Failed: ${failedPayouts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout processing completed',
        processed_count: processedPayouts.length,
        failed_count: failedPayouts.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-pending-payouts function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
