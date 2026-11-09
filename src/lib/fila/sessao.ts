import type { Comprovante, Ticket } from "./tipos";

// Sessão local: dados essenciais do eleitor e do administrador para sobreviver ao F5.
// O estado da fila NÃO é mais cacheado localmente: o servidor fornece em tempo real via WebSocket e GET /fila.
// Toda leitura/escrita fica em try/catch (aba anônima ou storage bloqueado).

export const CHAVE_TICKET = "fila:ticket:v2";
export const CHAVE_COMPROVANTE = "fila:voto:v1";
export const CHAVE_ADMIN = "fila:admin:v1";
export const CHAVE_JA_VOTOU = "fila:jaVotou:v1";
export const CHAVE_DEVICE_TOKEN = "fila:dispositivo:token:v1";

export function obterOuCriarDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = localStorage.getItem(CHAVE_DEVICE_TOKEN);
    if (!token) {
      token =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CHAVE_DEVICE_TOKEN, token);
    }
    return token;
  } catch {
    return "";
  }
}

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

export function ehTicket(v: unknown): v is Ticket {
  return ehUsuario(v) && ehObjeto(v) && typeof v.emitidoEm === "string" && typeof v.chave === "string";
}

function ehComprovante(v: unknown): v is Comprovante {
  return (
    ehObjeto(v) &&
    ehObjeto(v.voto) &&
    typeof v.voto.candidatoId === "number" &&
    Array.isArray(v.resultado)
  );
}

function ehSessaoAdmin(v: unknown): v is SessaoAdmin {
  return ehObjeto(v) && typeof v.token === "string" && typeof v.nome === "string";
}

export const lerTicket = () => ler(CHAVE_TICKET, ehTicket);
export const lerComprovante = () => ler(CHAVE_COMPROVANTE, ehComprovante);
export const lerSessaoAdmin = () => ler(CHAVE_ADMIN, ehSessaoAdmin);
export const gravarTicket = (t: Ticket | null) => gravar(CHAVE_TICKET, t);
export const gravarComprovante = (c: Comprovante | null) => gravar(CHAVE_COMPROVANTE, c);
export const gravarSessaoAdmin = (s: SessaoAdmin | null) => gravar(CHAVE_ADMIN, s);

export function lerJaVotou(): boolean {
  try {
    return localStorage.getItem(CHAVE_JA_VOTOU) === "true";
  } catch {
    return false;
  }
}

export function gravarJaVotou(votou: boolean): void {
  try {
    if (votou) localStorage.setItem(CHAVE_JA_VOTOU, "true");
    else localStorage.removeItem(CHAVE_JA_VOTOU);
  } catch {
    // sem storage
  }
}

// Limpeza de cache legado obsoleto (fila inteira serializada no localStorage)
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("fila:estado:v2");
    localStorage.removeItem("fila:estado:v1");
  } catch {
    // ignora
  }
}
