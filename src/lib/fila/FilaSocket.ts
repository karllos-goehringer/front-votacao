import type { FilaEstado, MensagemServidor, StatusConexao, TipoPedido, Usuario, Voto } from "./tipos";

/**
 * Camada entre o front e o back: uma conexão WebSocket só, com
 * - reconexão automática (backoff exponencial, e na hora quando a rede/aba volta);
 * - pedido/resposta casados por requestId, com timeout;
 * - assinaturas para o estado da fila (broadcast do servidor) e o status da conexão.
 */
export class FilaSocket {
  private ws: WebSocket | null = null;
  private status: StatusConexao = "conectando";
  private tentativas = 0;
  private reconexao: ReturnType<typeof setTimeout> | null = null;
  private encerrado = false;
  private contador = 0;

  private readonly pendentes = new Map<
    string,
    { resolve: (data: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly ouvintesEstado = new Set<(estado: FilaEstado) => void>();
  private readonly ouvintesStatus = new Set<(status: StatusConexao) => void>();
  private readonly ouvintesProximo = new Set<(usuario: Usuario) => void>();
  private readonly ouvintesVoto = new Set<(voto: Voto) => void>();

  constructor(private readonly url: string) {}

  conectar(): void {
    this.encerrado = false;
    window.addEventListener("online", this.reconectarJa);
    document.addEventListener("visibilitychange", this.aoMudarVisibilidade);
    this.abrir();
  }

  /** Fecha de vez (sem reconectar). */
  fechar(): void {
    this.encerrado = true;
    window.removeEventListener("online", this.reconectarJa);
    document.removeEventListener("visibilitychange", this.aoMudarVisibilidade);
    if (this.reconexao) clearTimeout(this.reconexao);
    this.ws?.close();
    this.ws = null;
    this.falharPendentes("Conexão encerrada");
  }

  onEstado(fn: (estado: FilaEstado) => void): () => void {
    this.ouvintesEstado.add(fn);
    return () => this.ouvintesEstado.delete(fn);
  }

  onStatus(fn: (status: StatusConexao) => void): () => void {
    this.ouvintesStatus.add(fn);
    return () => this.ouvintesStatus.delete(fn);
  }

  /** Servidor avisou quem pode votar agora. */
  onProximo(fn: (usuario: Usuario) => void): () => void {
    this.ouvintesProximo.add(fn);
    return () => this.ouvintesProximo.delete(fn);
  }

  /** Alguém votou (o resultado mudou). */
  onVoto(fn: (voto: Voto) => void): () => void {
    this.ouvintesVoto.add(fn);
    return () => this.ouvintesVoto.delete(fn);
  }

  /** Envia um pedido e espera a resposta do servidor. */
  pedir<T = unknown>(type: TipoPedido, payload?: Record<string, unknown>, timeoutMs = 8000): Promise<T> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Sem conexão com o servidor. Tente de novo em instantes."));
    }
    const requestId = `${Date.now().toString(36)}-${(this.contador++).toString(36)}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendentes.delete(requestId);
        reject(new Error("O servidor demorou para responder"));
      }, timeoutMs);
      this.pendentes.set(requestId, { resolve: resolve as (d: unknown) => void, reject, timer });
      ws.send(JSON.stringify({ type, requestId, payload }));
    });
  }

  private abrir(): void {
    if (this.encerrado) return;
    this.mudarStatus("conectando");

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.agendarReconexao();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.tentativas = 0;
      this.mudarStatus("conectado");
    };

    ws.onmessage = (ev) => {
      let msg: MensagemServidor;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === "fila:estado") {
        this.ouvintesEstado.forEach((fn) => fn(msg.payload));
      } else if (msg.type === "fila:proximo") {
        this.ouvintesProximo.forEach((fn) => fn(msg.payload));
      } else if (msg.type === "voto:novo") {
        this.ouvintesVoto.forEach((fn) => fn(msg.payload));
      } else if (msg.type === "resposta" && msg.requestId) {
        const pendente = this.pendentes.get(msg.requestId);
        if (!pendente) return;
        clearTimeout(pendente.timer);
        this.pendentes.delete(msg.requestId);
        if (msg.ok) pendente.resolve(msg.data);
        else pendente.reject(new Error(msg.erro));
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws) return; // conexão antiga, já substituída
      this.ws = null;
      this.falharPendentes("A conexão caiu antes da resposta");
      this.mudarStatus("desconectado");
      this.agendarReconexao();
    };

    // onerror sempre vem seguido de onclose; a reconexão fica por conta dele.
    ws.onerror = () => {};
  }

  private agendarReconexao(): void {
    if (this.encerrado || this.reconexao) return;
    const espera = Math.min(1000 * 2 ** this.tentativas, 10_000);
    this.tentativas++;
    this.reconexao = setTimeout(() => {
      this.reconexao = null;
      this.abrir();
    }, espera);
  }

  private reconectarJa = () => {
    if (this.encerrado || this.ws) return;
    if (this.reconexao) clearTimeout(this.reconexao);
    this.reconexao = null;
    this.tentativas = 0;
    this.abrir();
  };

  private aoMudarVisibilidade = () => {
    if (document.visibilityState === "visible") this.reconectarJa();
  };

  private falharPendentes(motivo: string): void {
    for (const { reject, timer } of this.pendentes.values()) {
      clearTimeout(timer);
      reject(new Error(motivo));
    }
    this.pendentes.clear();
  }

  private mudarStatus(status: StatusConexao): void {
    if (status === this.status) return;
    this.status = status;
    this.ouvintesStatus.forEach((fn) => fn(status));
  }
}

/** NEXT_PUBLIC_WS_URL, ou o mesmo host da página na porta 3001 (funciona também na rede local). */
export function urlDoServidor(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocolo}://${window.location.hostname}:3001/ws`;
}
