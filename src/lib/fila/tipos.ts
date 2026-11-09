// Espelha os tipos do back (src/domain e src/services/FilaService).

export type TipoFila = "PREFERENCIAL" | "COMUM";

export interface Usuario {
  id: number;
  nome: string;
  /** Número fixo do ticket (C007). */
  senha: number;
  /** Posição atual dentro da fila (1 = o próximo; 0 = na cabine). */
  posicaoNaFila: number;
  tipoFila: TipoFila;
  entrouEm: string;
  chamadoEm: string | null;
  mock: boolean;
}

/** Usuário aguardando: quantas pessoas tem à frente até a cabine. */
export interface UsuarioNaFila extends Usuario {
  aFrente: number;
}

export interface FilaEstado {
  /** true quando o contexto exibido é o de demonstração (mock). */
  modoMock?: boolean;
  preferencial: UsuarioNaFila[];
  comum: UsuarioNaFila[];
  /** Quem está na cabine é quem pode votar. */
  naCabine: Usuario | null;
  ultimosChamados: Usuario[];
  atualizadoEm: string;
}

/** Senha do eleitor guardada no navegador. A chave autoriza votar e sair da fila. */
export interface Ticket extends Usuario {
  chave: string;
  emitidoEm: string;
}

export interface Partido {
  nome: string;
  digito: string;
}

export interface Candidato {
  id: number;
  nome: string;
  /** null para "Anular" (voto nulo). */
  partido: Partido | null;
  urlFoto: string | null;
}

/** O voto nulo ("Anular") é o único candidato sem partido. */
export function ehNulo(c: { partido: Partido | null }): boolean {
  return c.partido === null;
}

/** Item do array de GET /resultados. */
export interface ContagemCandidato {
  candidatoId: number;
  nome: string;
  /** null para "Anular" (voto nulo). */
  partido: Partido | null;
  urlFoto: string | null;
  votos: number;
}

/**
 * GET /resultados devolve `{ id, qtdVotosTotal, ... }`, enquanto o resultado do voto
 * (POST /votos) usa `{ candidatoId, votos, ... }`. Converte qualquer um dos dois formatos.
 */
export function normalizarContagem(lista: unknown): ContagemCandidato[] {
  if (!Array.isArray(lista)) return [];
  return lista.map((item: Record<string, unknown>) => ({
    candidatoId: Number(item.candidatoId ?? item.idCandidato ?? item.id),
    nome: String(item.nome ?? ""),
    partido: (item.partido as Partido | null) ?? null,
    urlFoto: (item.urlFoto as string | null) ?? (item.url_foto as string | null) ?? null,
    votos: Number(item.votos ?? item.qtdVotosTotal ?? item.votosTotais ?? 0),
  }));
}

export interface Voto {
  id?: number;
  usuarioNome: string;
  senha: number;
  tipoFila: TipoFila;
  candidatoId: number;
  candidatoNome?: string;
  entrouNaFilaEm: string;
  chamadoEm: string;
  votouEm: string;
  tempoNaFilaMs: number;
  tempoParaVotarMs: number;
}

export interface ResultadoVoto {
  voto: Voto;
  resultado: ContagemCandidato[];
  tempoProcessamentoMs: number;
}

/** Comprovante guardado no navegador depois de votar (a tela de resultado sobrevive ao F5). */
export interface Comprovante extends ResultadoVoto {
  /** Tempo de ida e volta da requisição de voto, medido no navegador. */
  tempoRequisicaoMs: number;
}

export type StatusConexao = "conectando" | "conectado" | "desconectado";

export type MensagemServidor =
  | { type: "fila:estado"; payload: FilaEstado }
  | { type: "fila:proximo"; payload: Usuario }
  | { type: "voto:novo"; payload: Voto }
  | { type: "resposta"; requestId?: string; ok: true; data?: unknown }
  | { type: "resposta"; requestId?: string; ok: false; erro: string };

export type TipoPedido = "fila:estado" | "fila:entrar" | "fila:remover";

export const ROTULO_FILA: Record<TipoFila, string> = {
  PREFERENCIAL: "Preferencial",
  COMUM: "Comum",
};

/** P001, C012… */
export function senha(u: Pick<Usuario, "tipoFila" | "senha">): string {
  return `${u.tipoFila === "PREFERENCIAL" ? "P" : "C"}${String(u.senha).padStart(3, "0")}`;
}

/** 1,2 s · 3 min 05 s */
export function duracao(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1).replace(".", ",")} s`;
  const min = Math.floor(s / 60);
  const resto = Math.round(s % 60);
  return `${min} min ${String(resto).padStart(2, "0")} s`;
}

export function horario(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR");
}
