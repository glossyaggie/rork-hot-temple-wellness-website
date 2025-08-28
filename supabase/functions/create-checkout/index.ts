import Stripe from 'https://esm.sh/stripe@16.5.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const {
      priceId,
      quantity = 1,
      mode,
      successUrl,
      cancelUrl,
      userId,
      pass_type,
      metadata = {},
    } = await req.json();

    if (!priceId || !mode || !successUrl || !cancelUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const mergedMeta: Record<string, string> = Object.fromEntries(
      Object.entries({ ...metadata, userId, pass_type })
        .filter(([, v]) => typeof v !== 'undefined' && v !== null)
        .map(([k, v]) => [k, String(v)]) as Array<[string, string]>,
    );

    console.log('create-checkout received', {
      priceId,
      mode,
      userId,
      pass_type,
      metadata: mergedMeta,
    });

    const basePayload: Record<string, unknown> = {
      mode,
      line_items: [{ price: priceId, quantity }],
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: mergedMeta,
    };

    if (mode === 'subscription') {
      (basePayload as any).subscription_data = { metadata: mergedMeta };
    }

    const session = await stripe.checkout.sessions.create(basePayload as any);

    console.log('create-checkout session created', { sessionId: session.id, hasMetadata: !!session.metadata, metadataKeys: Object.keys(session.metadata ?? {}) });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { 'Content-Type': 'application/json', ...cors } },
    );
  } catch (err) {
    console.error('create-checkout error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
});
