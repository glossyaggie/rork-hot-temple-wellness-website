import Stripe from 'https://esm.sh/stripe@16.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const priceMap: Record<string, { pass_type: string; credits?: number; durationDays?: number; mode: 'payment' | 'subscription' }>
= {
  'price_1S0r9bARpqh0Ut1y4lHGGuAT': { pass_type: 'single',     credits: 1,  mode: 'payment' },
  'price_1S0rGpARpqh0Ut1yYrnt5R6V': { pass_type: '5-class',    credits: 5,  mode: 'payment' },
  'price_1S0rHLARpqh0Ut1ybWGa3ocf': { pass_type: '10-class',   credits: 10, mode: 'payment' },
  'price_1S0rHqARpqh0Ut1ygGGaoqac': { pass_type: '25-class',   credits: 25, mode: 'payment' },
  'price_1S0rIRARpqh0Ut1yQkmz18xc': { pass_type: 'weekly-unlimited',   durationDays: 7,   mode: 'subscription' },
  'price_1S0rJlARpqh0Ut1yaeBEQVRf': { pass_type: 'monthly-unlimited',  durationDays: 30,  mode: 'subscription' },
  'price_1S0rKbARpqh0Ut1ydYwnH2Zy': { pass_type: 'vip-monthly',        durationDays: 30,  mode: 'subscription' },
  'price_1S0rLOARpqh0Ut1y2lbJ17g7': { pass_type: 'vip-yearly',         durationDays: 365, mode: 'subscription' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { sessionId, userId } = await req.json();
    if (!sessionId || !userId) {
      return new Response(JSON.stringify({ error: 'sessionId and userId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price', 'subscription'],
    });

    const priceId =
      (session as any).line_items?.data?.[0]?.price?.id ?? (session as any).line_items?.data?.[0]?.price;
    if (!priceId || !priceMap[priceId]) {
      return new Response(JSON.stringify({ error: 'Unknown priceId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const cfg = priceMap[priceId];

    if (cfg.mode === 'payment') {
      if ((session as any).payment_status !== 'paid') {
        return new Response(JSON.stringify({ error: 'Payment not completed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }

      const addCredits = cfg.credits ?? 0;

      const { data: existing, error: e1 } = await supabase
        .from('user_passes')
        .select('id, remaining_credits')
        .eq('user_id', userId)
        .eq('pass_type', cfg.pass_type)
        .maybeSingle();

      if (e1) throw e1;

      if (existing) {
        const { error } = await supabase
          .from('user_passes')
          .update({
            remaining_credits: ((existing as any).remaining_credits ?? 0) + addCredits,
            is_active: true,
            expires_at: null,
          })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_passes').insert({
          user_id: userId,
          pass_type: cfg.pass_type,
          remaining_credits: addCredits,
          is_active: true,
          expires_at: null,
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ ok: true, type: 'credits', added: addCredits }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    if (cfg.mode === 'subscription') {
      const sub = (session as any).subscription && typeof (session as any).subscription === 'object'
        ? (session as any).subscription
        : await (async () => {
            if (typeof (session as any).subscription === 'string') {
              return await stripe.subscriptions.retrieve((session as any).subscription as string);
            }
            return null;
          })();

      if (!sub || (sub as any).status !== 'active') {
        return new Response(JSON.stringify({ error: 'Subscription not active yet' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }

      const currentPeriodEnd = (sub as any).current_period_end as number;
      const expiresAt = new Date(currentPeriodEnd * 1000).toISOString();

      const { data: existing, error: e2 } = await supabase
        .from('user_passes')
        .select('id')
        .eq('user_id', userId)
        .eq('pass_type', cfg.pass_type)
        .maybeSingle();
      if (e2) throw e2;

      if (existing) {
        const { error } = await supabase
          .from('user_passes')
          .update({ is_active: true, expires_at: expiresAt, remaining_credits: null })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_passes').insert({
          user_id: userId,
          pass_type: cfg.pass_type,
          is_active: true,
          expires_at: expiresAt,
          remaining_credits: null,
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ ok: true, type: 'unlimited', expires_at: expiresAt }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported mode' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
});
