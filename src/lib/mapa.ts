// Converte linhas do banco (snake_case) para objetos do app (camelCase) e vice-versa.
const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const NUMERICOS = new Set(['indice', 'reacao', 'p60', 'm100', 'm201', 'vel', 'criado']);

export function deRow<T>(row: Record<string, unknown>): T {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) o[camel(k)] = NUMERICOS.has(k) && v != null ? Number(v) : v;
  return o as T;
}

export function paraRow(obj: object): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) o[snake(k)] = v;
  return o;
}
