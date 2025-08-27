declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

declare module 'https://esm.sh/stripe@16.5.0?target=deno' {
  const Stripe: any;
  export default Stripe;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export const createClient: any;
}
