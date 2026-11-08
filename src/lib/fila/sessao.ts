import type { Comprovante, FilaEstado, Ticket } from "./tipos";

// Sessão local: o que fica salvo no navegador para sobreviver ao F5.
// Toda leitura/escrita fica em try/catch (aba anônima ou storage bloqueado).

export const CHAVE_ESTADO = "fila:estado:v2";
export const CHAVE_TICKET = "fila:ticket:v2";
export const CHAVE_COMPROVANTE = "fila:voto:v1";
export const CHAVE_ADMIN = "fila:admin:v1";

export interface SessaoAdmin {
  token: string;
  nome: string;
  expiraEm: string;
}

function ler<T>(chave: string, valido: (v: unknown) => v is T): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    const valor: unknown = JSON.parse(bruto);
    return valido(valor) ? valor : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem storage: segue só com o estado em memória
  }
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function ehUsuario(v: unknown): boolean {
  return (
    ehObjeto(v) &&
    typeof v.id === "number" &&
    typeof v.nome === "string" &&
    typeof v.senha === "number" &&
    typeof v.posicaoNaFila === "number" &&
    (v.tipoFila === "PREFERENCIAL" || v.tipoFila === "COMUM")
  );
}

export function ehEstado(v: unknown): v is FilaEstado {
  return (
    ehObjeto(v) &&
    Array.isArray(v.preferencial) &&
    v.preferencial.every(ehUsuario) &&
    Array.isArray(v.comum) &&
    v.comum.every(ehUsuario) &&
    Array.isArray(v.ultimosChamados) &&
    v.ultimosChamados.every(ehUsuario) &&
    (v.naCabine === null || ehUsuario(v.naCabine)) &&
    typeof v.atualizadoEm === "string"
  );
}

export function ehTicket(v: unknown): v is Ticket {
  return ehUsuario(v) && ehObjeto(v) && typeof v.emitidoEm === "string" && typeof v.chave === "string";
}

function ehComprovante(v: unknown): v is Comprovante {
  return (
    ehObjeto(v) &&
    ehObjeto(v.voto) &&
    typeof v.voto.candidatoId === "number" &&
    Array.isArray(v.resultado) &&
    typeof v.tempoRequisicaoMs === "number"
  );
}

function ehSessaoAdmin(v: unknown): v is SessaoAdmin {
  return ehObjeto(v) && typeof v.token === "string" && typeof v.nome === "string";
}

export const lerEstado = () => ler(CHAVE_ESTADO, ehEstado);
export const lerTicket = () => ler(CHAVE_TICKET, ehTicket);
export const lerComprovante = () => ler(CHAVE_COMPROVANTE, ehComprovante);
export const lerSessaoAdmin = () => ler(CHAVE_ADMIN, ehSessaoAdmin);
export const gravarEstado = (e: FilaEstado | null) => gravar(CHAVE_ESTADO, e);
export const gravarTicket = (t: Ticket | null) => gravar(CHAVE_TICKET, t);
export const gravarComprovante = (c: Comprovante | null) => gravar(CHAVE_COMPROVANTE, c);
export const gravarSessaoAdmin = (s: SessaoAdmin | null) => gravar(CHAVE_ADMIN, s);
