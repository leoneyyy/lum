// Operator details for Impressum and Datenschutz. Read from server-only env
// vars (set them in Vercel → Settings → Environment Variables) so a home
// address never lands in the repository. Pages are static: change the vars,
// then redeploy.

export interface Operator {
  name: string;
  street: string;
  city: string;
  email: string;
}

export function getOperator(): Operator {
  return {
    name: process.env.IMPRESSUM_NAME?.trim() ?? '',
    street: process.env.IMPRESSUM_STREET?.trim() ?? '',
    city: process.env.IMPRESSUM_CITY?.trim() ?? '',
    email: process.env.IMPRESSUM_EMAIL?.trim() ?? '',
  };
}

export function missingOperatorFields(op: Operator): string[] {
  const labels: Record<keyof Operator, string> = {
    name: 'IMPRESSUM_NAME',
    street: 'IMPRESSUM_STREET',
    city: 'IMPRESSUM_CITY',
    email: 'IMPRESSUM_EMAIL',
  };
  return (Object.keys(labels) as (keyof Operator)[]).filter(k => !op[k]).map(k => labels[k]);
}

/** Where the Supabase project stores data, e.g. "Frankfurt (EU)". */
export function getSupabaseRegion(): string {
  return process.env.SUPABASE_REGION?.trim() ?? '';
}
