import Stripe from 'https://esm.sh/stripe@16.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
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
  'price_1S0vfBARpqh0Ut1ybKjeqehJ': { pass_type: '5-class',    credits: 5,  mode: 'payment' },
  'price_1S0rHLARpqh0Ut1ybWGa3ocf': { pass_type: '10-class',   credits: 10, mode: 'payment' },
  'price_1S0rHqARpqh0Ut1ygGGaoqac': { pass_type: '25-class',   credits: 25, mode: 'payment' },
  'price_1S0rIRARpqh0Ut1yQkmz18xc': { pass_type: 'weekly-unlimited',   durationDays: 7,   mode: 'subscription' },
  'price_1S0rJlARpqh0Ut1yaeBEQVRf': { pass_type: 'monthly-unlimited',  durationDays: 30,  mode: 'subscription' },
  'price_1S0rKbARpqh0Ut1ydYwnH2Zy': { pass_type: 'vip-monthly',        durationDays: 30,  mode: 'subscription' },
  'price_1S0rLOARpqh0Ut1y2lbJ17g7': { pass_type: 'vip-yearly',         durationDays: 365, mode: 'subscription' },
};

async function applyCredits(userId: string, cfg: { pass_type: string; credits?: number; durationDays?: number; mode: 'payment' | 'subscription' }) {
  if (cfg.mode === 'payment') {
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
    return { ok: true, type: 'credits', added: addCredits } as const;
  }

  const now = new Date();
  const durationDays = cfg.durationDays ?? 30;
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

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
  return { ok: true, type: 'unlimited', expires_at: expiresAt } as const;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  if (req.method !== 'POST') {
    return new Response('Not Found', { status: 404, headers: cors });
  }

  try {
    if (!STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    const payload = await req.text();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, STRIPE_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const sessionId: string = session.id;

      const fullSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price', 'subscription'] });

      let userId: string | undefined = (fullSession.metadata && (fullSession.metadata.userId as string)) ?? undefined;
      if (!userId) {
        userId = (fullSession.client_reference_id as string | undefined) ?? undefined;
      }
      if (!userId && fullSession.mode === 'payment' && fullSession.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(fullSession.payment_intent as string);
        userId = (pi.metadata?.userId as string | undefined) ?? userId;
      }
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId after fallbacks' }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
      }

      const priceId = (fullSession as any).line_items?.data?.[0]?.price?.id ?? (fullSession as any).line_items?.data?.[0]?.price;
      if (!priceId || !priceMap[priceId]) {
        return new Response(JSON.stringify({ error: 'Unknown priceId' }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
      }

      const cfg = priceMap[priceId];
      const result = await applyCredits(userId, cfg);
      return new Response(JSON.stringify({ ok: true, handled: 'checkout.session.completed', result }), { headers: { 'Content-Type': 'application/json', ...cors } });
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;

      let userId: string | undefined = invoice.metadata?.userId;
      let priceId: string | undefined;

      if (invoice.subscription) {
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId as string, { expand: ['items.data.price'] });
        userId = userId ?? (subscription.metadata?.userId as string | undefined);
        priceId = subscription.items?.data?.[0]?.price?.id as string | undefined;
      }

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId for invoice' }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
      }
      if (!priceId || !priceMap[priceId]) {
        return new Response(JSON.stringify({ error: 'Unknown priceId for invoice' }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
      }

      const cfg = priceMap[priceId];
      const result = await applyCredits(userId, cfg);
      return new Response(JSON.stringify({ ok: true, handled: 'invoice.payment_succeeded', result }), { headers: { 'Content-Type': 'application/json', ...cors } });
    }

    return new Response(JSON.stringify({ ok: true, ignored: event.type }), { headers: { 'Content-Type': 'application/json', ...cors } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  }
});
