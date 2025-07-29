import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { Body } = await req.json();
    const { stkCallback } = Body;

    // Update transaction status
    const { data: transaction, error: transactionError } = await supabase
      .from('mpesa_transactions')
      .update({
        status: stkCallback.ResultCode === 0 ? 'completed' : 'failed',
        result_code: stkCallback.ResultCode.toString(),
        result_desc: stkCallback.ResultDesc,
      })
      .eq('checkout_request_id', stkCallback.CheckoutRequestID)
      .select()
      .single();

    if (transactionError) throw transactionError;

    // If payment successful, update order status
    if (stkCallback.ResultCode === 0) {
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', transaction.order_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});