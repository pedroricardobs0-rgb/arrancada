'use client';
import { createClient } from './supabase/client';
import { paraRow } from './mapa';

export const TABELAS = {
  cat: 'categorias', camp: 'campeonatos', pil: 'pilotos', car: 'carros', ev: 'eventos', pux: 'puxadas', contato: 'pilotos_contato',
} as const;
export type Tabela = keyof typeof TABELAS;

const msg = (e: { message?: string; code?: string } | null) => {
  if (!e) return null;
  if (e.code === '23503') return 'Existem registros ligados a este item. Remova-os primeiro.';
  if (e.code === '42501' || /row-level security/i.test(e.message || '')) return 'Sem permissão para esta ação.';
  return e.message || 'Falha ao salvar.';
};

export async function salvar(t: Tabela, obj: object, conflito = 'id') {
  const { error } = await createClient().from(TABELAS[t]).upsert(paraRow(obj), { onConflict: conflito });
  if (error) throw new Error(msg(error)!);
}
export async function salvarVarios(t: Tabela, objs: object[]) {
  for (let i = 0; i < objs.length; i += 200) {
    const { error } = await createClient().from(TABELAS[t]).upsert(objs.slice(i, i + 200).map(paraRow));
    if (error) throw new Error(msg(error)!);
  }
}
export async function atualizar(t: Tabela, id: string, campos: object) {
  const { error } = await createClient().from(TABELAS[t]).update(paraRow(campos)).eq('id', id);
  if (error) throw new Error(msg(error)!);
}
export async function excluir(t: Tabela, id: string) {
  const { error } = await createClient().from(TABELAS[t]).delete().eq('id', id);
  if (error) throw new Error(msg(error)!);
}
export async function excluirOnde(t: Tabela, col: string, val: string | boolean) {
  const { error } = await createClient().from(TABELAS[t]).delete().eq(col, val);
  if (error) throw new Error(msg(error)!);
}
export async function salvarConfigs(add?: string, remove?: string) {
  const sb = createClient();
  const { error } = add ? await sb.from('configuracoes').upsert({ nome: add }) : await sb.from('configuracoes').delete().eq('nome', remove!);
  if (error) throw new Error(msg(error)!);
}

async function reduzir(file: File, max = 1400): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.85));
  } catch { return file; }
}

export async function enviarFoto(file: File, userId: string) {
  const blob = await reduzir(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await createClient().storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error('Falha ao enviar a foto: ' + error.message);
  return path;
}
export async function apagarFoto(path?: string | null) {
  if (path) await createClient().storage.from('fotos').remove([path]);
}
