import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

type Body = {
  userId: string;
  classId: number;
  useCreditPassId?: string | null;
};

async function hasUnlimited(passes: any[], now: Date) {
  for (const p of passes) {
    if (p.is_active === false) continue;
    const exp = p.expires_at ? new Date(p.expires_at) : null;
    if (exp && exp < now) continue;
    const pt = (p.pass_type ?? '').toLowerCase();
    if (pt.includes('unlimited') || pt.includes('weekly') || pt.includes('monthly') || pt.includes('year')) {
      return { ok: true, expires_at: exp ? exp.toISOString() : null } as const;
    }
  }
  return { ok: false as const };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Not Found', { status: 404, headers: cors });

  try {
    const body = (await req.json()) as Body;
    const userId = body.userId;
    const classId = body.classId;
    const preferredPassId = body.useCreditPassId ?? null;

    if (!userId || !classId) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_params' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    const { data: cls, error: clsErr } = await supabase
      .from('class_schedule')
      .select('id, capacity')
      .eq('id', classId)
      .maybeSingle();
    if (clsErr) throw clsErr;
    if (!cls) return new Response(JSON.stringify({ ok: false, error: 'class_not_found' }), { headers: { 'Content-Type': 'application/json', ...cors } });

    const { count, error: cntErr } = await supabase
      .from('class_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);
    if (cntErr) throw cntErr;
    const currentCount = typeof count === 'number' ? count : 0;
    const isFull = typeof (cls as any).capacity === 'number' && currentCount >= (cls as any).capacity;
    if (isFull) return new Response(JSON.stringify({ ok: false, error: 'class_full' }), { headers: { 'Content-Type': 'application/json', ...cors } });

    const { data: existingBooking, error: existingErr } = await supabase
      .from('class_bookings')
      .select('id')
      .eq('user_id', userId)
      .eq('class_id', classId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingBooking) return new Response(JSON.stringify({ ok: true, alreadyBooked: true, usedCredit: false }), { headers: { 'Content-Type': 'application/json', ...cors } });

    const { data: passes, error: passErr } = await supabase
      .from('user_passes')
      .select('id, pass_type, remaining_credits, expires_at, is_active')
      .eq('user_id', userId);
    if (passErr) throw passErr;

    const now = new Date();
    const unlimited = await hasUnlimited(passes ?? [], now);

    let usedCredit = false;
    let remainingCredits: number | undefined = undefined;

    if (!(unlimited as any).ok) {
      let creditPass = (passes ?? []).find((p: any) => p.id === preferredPassId);
      if (!creditPass) {
        creditPass = (passes ?? []).find((p: any) => (p.is_active ?? true) && (p.remaining_credits ?? 0) > 0);
      }

      if (!creditPass) {
        return new Response(JSON.stringify({ ok: false, error: 'no_pass' }), { headers: { 'Content-Type': 'application/json', ...cors } });
      }

      const newRemaining = Math.max(0, (creditPass.remaining_credits ?? 0) - 1);

      const { error: decErr } = await supabase
        .from('user_passes')
        .update({ remaining_credits: newRemaining, is_active: newRemaining > 0 })
        .eq('id', creditPass.id);
      if (decErr) throw decErr;
      usedCredit = true;
      remainingCredits = newRemaining;
    }

    const { error: bookErr } = await supabase
      .from('class_bookings')
      .insert({ user_id: userId, class_id: classId });
    if (bookErr) throw bookErr;

    return new Response(JSON.stringify({ ok: true, usedCredit, remainingCredits }), { headers: { 'Content-Type': 'application/json', ...cors } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  }
});