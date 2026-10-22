export type Tracao = 'dianteira' | 'traseira' | '4x4';
export type Combustivel = 'alcool' | 'gasolina' | 'metanol';
export type Alimentacao = 'injetado' | 'carburado';
export type StatusEvento = 'agendado' | 'andamento' | 'encerrado';
export type StatusPiloto = 'pendente' | 'aprovado' | 'recusado';
export type Fase = 'classificatoria' | 'semi1' | 'semi2' | 'final' | 'terceiro' | 'copa';

export type Categoria = { id: string; nome: string; tipo: 'tempo' | 'caracteristica'; indice: number | null; descricao: string | null; exemplo?: boolean };
export type Campeonato = { id: string; nome: string; ano: number | null; pontuacao: number[]; exemplo?: boolean };
export type Piloto = {
  id: string; userId: string | null; nome: string; apelido: string | null; equipe: string | null; cidade: string | null;
  foto: string | null; status: StatusPiloto; motivoRecusa: string | null; exemplo?: boolean;
};
export type Contato = { pilotoId: string; email: string | null; telefone: string | null };
export type Carro = {
  id: string; pilotoId: string; modelo: string; ano: string | null; numero: string | null; configs: string[];
  tracao: Tracao | null; combustivel: Combustivel | null; alimentacao: Alimentacao | null; fotoCarro: string | null; fotoPiloto: string | null; exemplo?: boolean;
};
export type CopaMatchDef = { a: string; b: string };
export type Copa = { r1: CopaMatchDef[]; vencedores: Record<string, string | null> };
export type Evento = {
  id: string; nome: string; campeonatoId: string | null; data: string | null; local: string | null; status: StatusEvento;
  categorias: string[]; pontuacao: number[]; encerradoAntecipado: boolean;
  vencedores: Record<string, Record<string, string | null>>; copa: Copa | null; exemplo?: boolean;
};
export type Puxada = {
  id: string; eventoId: string; categoriaId: string | null; fase: Fase; copaKey: string | null; pilotoId: string; carroId: string;
  reacao: number | null; p60: number | null; m100: number | null; m201: number | null; vel: number | null;
  valida: boolean; motivo: string | null; criado: number; exemplo?: boolean;
};

export type Dados = {
  cat: Record<string, Categoria>;
  camp: Record<string, Campeonato>;
  pil: Record<string, Piloto>;
  car: Record<string, Carro>;
  ev: Record<string, Evento>;
  pux: Record<string, Puxada>;
  contatos: Record<string, Contato>;
  configs: string[];
};

export type Sessao = { userId: string | null; email: string | null; isAdmin: boolean; meuPilotoId: string | null };
