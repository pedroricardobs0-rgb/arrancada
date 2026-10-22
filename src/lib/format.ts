export const ft = (n: number | null | undefined, d = 3) => (n == null || !isFinite(n) ? '—' : n.toFixed(d).replace('.', ','));
export const num = (v: string | null | undefined) => {
  if (v == null || v.trim() === '') return null;
  const n = parseFloat(v.replace(',', '.'));
  return isFinite(n) ? n : null;
};
export const fdate = (d: string | null | undefined) => {
  if (!d) return 'Data a definir';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};
export const initials = (n?: string | null) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export const fotoUrl = (path?: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${path}` : null;
export const byName = (a: { nome?: string | null }, b: { nome?: string | null }) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
export const byDateDesc = (a: { data?: string | null }, b: { data?: string | null }) => (b.data || '').localeCompare(a.data || '');
export const byDateAsc = (a: { data?: string | null }, b: { data?: string | null }) => (a.data || '').localeCompare(b.data || '');
