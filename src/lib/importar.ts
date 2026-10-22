// Leitura do relatório "Tempos por pilotos" do cronometrador (PDF) em linhas de puxada.

export type LinhaPdf = {
  linha: number;
  letra: string;
  nome: string;
  carro: string;
  modelo: string;
  flag: '_' | 'QE' | 'QD' | 'B';
  faixa: 'E' | 'D' | null;
  reacao: number | null;
  p60: number | null;
  m100: number | null;
  m201: number | null;
  vel: number | null;
  ordem: number;
  chave: string;
};

// Valores 59,99x significam "sem tempo" no cronômetro.
const tempo = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return !isFinite(n) || n >= 59.99 ? null : n;
};

const RE = /^\s*(\d+)\s+([A-Z])\s+(.+?)\s+(_|Q|B)\s*([ED])?\s*([+-])\s*(\d+,\d+)\s+(\d+,\d+)\s+(\d+,\d+)\s+(\d+,\d+)\s+(\d+)\s+(\d+,\d+)\s+([SN])\s+(\d+)\s*$/;

export function lerLinhas(linhas: string[]): { ok: LinhaPdf[]; ignoradas: string[] } {
  const ok: LinhaPdf[] = [];
  const ignoradas: string[] = [];
  for (const raw of linhas) {
    const l = raw.replace(/\s+/g, ' ').trim();
    if (!/^\d+ [A-Z] /.test(l)) continue; // cabeçalhos e rodapés
    const m = RE.exec(l);
    if (!m) { ignoradas.push(l); continue; }
    const [, po, letra, meio, flag, faixaL, sinal, rea, s60, s100, s201, vfin, , , ordem] = m;
    // "NOME DO PILOTO  NÚMERO  MODELO": o número do carro é o primeiro número inteiro depois do nome
    const t = meio.split(' ');
    const i = t.findIndex((x, k) => k > 0 && /^\d+$/.test(x));
    const nome = (i > 0 ? t.slice(0, i) : t).join(' ');
    const carro = i > 0 ? t[i] : '';
    const modelo = i > 0 ? t.slice(i + 1).join(' ') : '';
    const faixa = (faixaL || null) as LinhaPdf['faixa'];
    const r = tempo(rea);
    const v = parseInt(vfin, 10);
    ok.push({
      linha: +po, letra, nome, carro, modelo, flag: (flag === 'Q' ? 'Q' + (faixa || '') : flag) as LinhaPdf['flag'], faixa,
      reacao: r == null ? null : sinal === '-' ? -r : r,
      p60: tempo(s60), m100: tempo(s100), m201: tempo(s201), vel: v > 0 ? v : null,
      ordem: +ordem,
      chave: `${ordem}-${faixa || ''}-${carro}-${letra}`,
    });
  }
  return { ok, ignoradas };
}

/** Extrai as linhas de texto do PDF, agrupando os pedaços pela altura na página. */
export async function linhasDoPdf(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  return agruparLinhas(doc);
}

type Doc = { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> };

export async function agruparLinhas(doc: Doc): Promise<string[]> {
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
    for (const it of items as { str?: string; transform?: number[] }[]) {
      if (!it.str || !it.transform || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, parts: [] }; rows.push(row); }
      row.parts.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) out.push(r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' '));
  }
  return out;
}
