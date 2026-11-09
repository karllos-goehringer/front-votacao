"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { FilaSocket, urlDoServidor } from "./FilaSocket";
import {
  CHAVE_COMPROVANTE,
  CHAVE_JA_VOTOU,
  CHAVE_TICKET,
  gravarComprovante,
  gravarJaVotou,
  gravarTicket,
  lerComprovante,
  lerJaVotou,
  lerTicket,
  obterOuCriarDeviceToken,
} from "./sessao";
import { normalizarContagem } from "./tipos";
import type {
  Comprovante,
  ContagemCandidato,
  FilaEstado,
  ResultadoVoto,
  StatusConexao,
  Ticket,
  TipoFila,
  Usuario,
} from "./tipos";

export type SituacaoTicket =
  | { tipo: "aguardando"; posicao: number; aFrente: number }
  | { tipo: "na-cabine" }
  | { tipo: "votou" }
  | { tipo: "fora" }
  | { tipo: "desconhecida" };

interface FilaContexto {
  estado: FilaEstado | null;
  status: StatusConexao;
  /** true quando o estado veio do servidor nesta conexão (e não do cache local). */
  sincronizado: boolean;
  meuTicket: Ticket | null;
  situacao: SituacaoTicket | null;
  /** Indica se este navegador já concluiu seu voto nesta eleição. */
  jaVotou: boolean;
  /** Indica se o status do dispositivo foi validado contra o banco (GET /dispositivo/status). */
  dispositivoVerificado: boolean;
  /** Comprovante do voto deste navegador (existe entre votar e clicar em Concluir). */
  comprovante: Comprovante | null;
  /** Quantidade absoluta de votos de cada candidato (GET /resultados), atualizada ao vivo. */
  resultado: ContagemCandidato[] | null;
  /** Quando o resultado foi buscado pela última vez. */
  resultadoEm: string | null;
  /** Falha ao buscar o resultado (o último conhecido continua na tela). */
  erroResultado: string | null;
  entrar(nome: string, tipoFila: TipoFila): Promise<Ticket>;
  sairDaFila(): Promise<void>;
  votar(candidatoId: number): Promise<Comprovante>;
  /** Encerra a sessão do eleitor (logout): apaga senha e comprovante deste navegador. */
  concluir(): void;
}

const Contexto = createContext<FilaContexto | null>(null);

const noNavegador = typeof window !== "undefined";

export function FilaProvider({ children }: { children: ReactNode }) {
  // O estado da fila vem em tempo real do servidor (REST + WebSocket).
  // Apenas a senha do eleitor e o comprovante ficam no localStorage para o F5 não perder o voto/lugar.
  const [estado, setEstado] = useState<FilaEstado | null>(null);
  const [meuTicket, setMeuTicket] = useState<Ticket | null>(() => (noNavegador ? lerTicket() : null));
  const [comprovante, setComprovante] = useState<Comprovante | null>(() => (noNavegador ? lerComprovante() : null));
  const [jaVotou, setJaVotou] = useState<boolean>(() => (noNavegador ? lerJaVotou() || Boolean(lerComprovante()) : false));
  const [dispositivoVerificado, setDispositivoVerificado] = useState<boolean>(() => {
    if (!noNavegador) return false;
    return !lerJaVotou() && !lerComprovante();
  });
  const ultimoVotoLocalRef = useRef<number>(0);
  const [resultado, setResultadoBruto] = useState<ContagemCandidato[] | null>(null);
  const [resultadoEm, setResultadoEm] = useState<string | null>(null);
  const [erroResultado, setErroResultado] = useState<string | null>(null);
  const setResultado = useCallback((r: ContagemCandidato[]) => {
    setResultadoBruto(normalizarContagem(r));
    setResultadoEm(new Date().toISOString());
    setErroResultado(null);
  }, []);
  const [status, setStatus] = useState<StatusConexao>("conectando");
  const [sincronizado, setSincronizado] = useState(false);
  const socketRef = useRef<FilaSocket | null>(null);

  useEffect(() => {
    const socket = new FilaSocket(urlDoServidor());
    socketRef.current = socket;

    // Sincroniza o status do dispositivo com a verdade autoritativa do banco de dados (GET /dispositivo/status)
    const sincronizarStatusDispositivo = async () => {
      try {
        const devToken = obterOuCriarDeviceToken();
        const query = devToken ? `?token=${encodeURIComponent(devToken)}&_t=${Date.now()}` : `?_t=${Date.now()}`;
        const r = await api<{ jaVotou: boolean; bloqueadoParaCadastro?: boolean }>(`/dispositivo/status${query}`);
        if (r.data && (typeof r.data.jaVotou === "boolean" || typeof r.data.bloqueadoParaCadastro === "boolean")) {
          const travado = Boolean(r.data.jaVotou || r.data.bloqueadoParaCadastro);
          if (travado) {
            // Se o backend confirma que este dispositivo físico/IP já votou no banco oficial,
            // marca jaVotou como true (impede votação duplicada mesmo sem comprovante em abas anônimas)
            setJaVotou(true);
            gravarJaVotou(true);
          } else if (Date.now() - ultimoVotoLocalRef.current > 5000) {
            // Se o backend informa que este dispositivo NÃO votou no banco atual (ex: após db:reset,
            // mesmo que outros dispositivos já tenham votado e totalVotos > 0), limpa a flag jaVotou
            // e eventual comprovante residual de eleição anterior para liberar o início e nova votação.
            setJaVotou(false);
            gravarJaVotou(false);
            setComprovante(null);
            gravarComprovante(null);
          }
        }
      } catch {
        // Se a rota falhar ou backend indisponível, mantém o estado atual
      } finally {
        setDispositivoVerificado(true);
      }
    };

    const atualizarResultado = () =>
      api<unknown[]>("/resultados")
        .then((r) => {
          const normalizado = normalizarContagem(r.data);
          setResultado(normalizado);
          const totalVotos = normalizado.reduce((acc, c) => acc + (c.votos || 0), 0);
          if (totalVotos === 0) {
            // Se o total de votos no banco for 0 (ex: após db:reset ou reiniciar fila),
            // limpa o voto, comprovante e senha deste eleitor para liberar nova votação e reexibir o início
            setJaVotou(false);
            setComprovante(null);
            setMeuTicket(null);
            gravarJaVotou(false);
            gravarComprovante(null);
            gravarTicket(null);
          }
        })
        .catch((err: unknown) => setErroResultado(err instanceof Error ? err.message : "Falha ao buscar resultados"));

    // Busca o estado inicial atualizado diretamente da API e valida o dispositivo
    api<FilaEstado>("/fila")
      .then((r) => {
        setEstado(r.data);
        setSincronizado(true);
      })
      .catch(() => undefined);

    void sincronizarStatusDispositivo();
    void atualizarResultado();

    const pararEstado = socket.onEstado((novo) => {
      setEstado(novo);
      setSincronizado(true);
      // Se a cabine e filas estiverem vazias (ex: reset ou restart de fila), revalida com o banco
      if (!novo.naCabine && novo.preferencial.length === 0 && novo.comum.length === 0) {
        void sincronizarStatusDispositivo();
        void atualizarResultado();
      }
    });

    const pararStatus = socket.onStatus((novo) => {
      setStatus(novo);
      if (novo !== "conectado") {
        setSincronizado(false);
      } else {
        // Ao restabelecer conexão (ex: após restart do servidor/BD), atualiza dados imediatamente
        void atualizarResultado();
        void sincronizarStatusDispositivo();
      }
    });

    const pararVoto = socket.onVoto(() => {
      void atualizarResultado();
      void sincronizarStatusDispositivo();
    });
    socket.conectar();

    // Mantém senha, comprovante e estado de votação iguais entre abas abertas.
    const aoMudarStorage = (ev: StorageEvent) => {
      if (ev.key === CHAVE_TICKET) setMeuTicket(lerTicket());
      if (ev.key === CHAVE_COMPROVANTE) setComprovante(lerComprovante());
      if (ev.key === CHAVE_JA_VOTOU) setJaVotou(lerJaVotou());
    };
    window.addEventListener("storage", aoMudarStorage);

    // Revalida imediatamente ao voltar para a aba do navegador
    const aoReativarAba = () => {
      void sincronizarStatusDispositivo();
      void atualizarResultado();
    };
    window.addEventListener("focus", aoReativarAba);
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") {
        aoReativarAba();
      }
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      pararEstado();
      pararStatus();
      pararVoto();
      window.removeEventListener("storage", aoMudarStorage);
      window.removeEventListener("focus", aoReativarAba);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      socket.fechar();
      socketRef.current = null;
    };
  }, [setResultado]);

  const pedir = useCallback(<T,>(...args: Parameters<FilaSocket["pedir"]>) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error("Conexão ainda não iniciada"));
    return socket.pedir<T>(...args);
  }, []);

  const definirTicket = useCallback((ticket: Ticket | null) => {
    setMeuTicket(ticket);
    gravarTicket(ticket);
  }, []);

  const definirComprovante = useCallback((c: Comprovante | null) => {
    setComprovante(c);
    gravarComprovante(c);
  }, []);

  const entrar = useCallback(
    async (nome: string, tipoFila: TipoFila) => {
      const devToken = obterOuCriarDeviceToken();
      const usuario = await pedir<Usuario & { chave: string }>("fila:entrar", {
        nome,
        tipoFila,
        dispositivoToken: devToken,
        tokenDispositivo: devToken,
      });
      const ticket: Ticket = { ...usuario, emitidoEm: new Date().toISOString() };
      definirComprovante(null);
      gravarJaVotou(false);
      setJaVotou(false);
      definirTicket(ticket);
      return ticket;
    },
    [pedir, definirTicket, definirComprovante],
  );

  const sairDaFila = useCallback(async () => {
    if (!meuTicket) return;
    await pedir("fila:remover", { id: meuTicket.id, chave: meuTicket.chave });
    definirTicket(null);
  }, [meuTicket, pedir, definirTicket]);

  /** Requisição de voto: o servidor tira o eleitor da cabine e a fila anda. */
  const votar = useCallback(
    async (candidatoId: number) => {
      if (!meuTicket) throw new Error("Você não está na fila");
      const devToken = obterOuCriarDeviceToken();
      const r = await api<ResultadoVoto>("/votos", {
        method: "POST",
        body: {
          usuarioId: meuTicket.id,
          chave: meuTicket.chave,
          candidatoId,
          dispositivoToken: devToken,
          tokenDispositivo: devToken,
        },
      });
      const novo: Comprovante = {
        ...r.data,
        resultado: normalizarContagem(r.data.resultado),
        tempoRequisicaoMs: r.tempoMs,
      };
      ultimoVotoLocalRef.current = Date.now();
      definirComprovante(novo);
      setResultado(novo.resultado);
      gravarJaVotou(true);
      setJaVotou(true);
      setDispositivoVerificado(true);
      // Limpa a senha do eleitor, pois o ciclo do ticket terminou com o voto computado
      definirTicket(null);
      return novo;
    },
    [meuTicket, definirComprovante, definirTicket, setResultado],
  );

  const concluir = useCallback(() => {
    definirComprovante(null);
    definirTicket(null);
    gravarJaVotou(true);
    setJaVotou(true);
    setDispositivoVerificado(true);
  }, [definirComprovante, definirTicket]);

  const situacao = useMemo(
    () => (meuTicket ? calcularSituacao(estado, meuTicket, comprovante, sincronizado, jaVotou) : null),
    [estado, meuTicket, comprovante, sincronizado, jaVotou],
  );

  const valor = useMemo<FilaContexto>(
    () => ({
      estado,
      status,
      sincronizado,
      meuTicket,
      situacao,
      jaVotou,
      dispositivoVerificado,
      comprovante,
      resultado,
      resultadoEm,
      erroResultado,
      entrar,
      sairDaFila,
      votar,
      concluir,
    }),
    [estado, status, sincronizado, meuTicket, situacao, jaVotou, dispositivoVerificado, comprovante, resultado, resultadoEm, erroResultado, entrar, sairDaFila, votar, concluir],
  );

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useFila(): FilaContexto {
  const ctx = use(Contexto);
  if (!ctx) throw new Error("useFila precisa estar dentro de <FilaProvider>");
  return ctx;
}

/** Onde está a minha senha? O servidor já manda quantas pessoas cada um tem à frente. */
function calcularSituacao(
  estado: FilaEstado | null,
  ticket: Ticket,
  comprovante: Comprovante | null,
  sincronizado: boolean,
  jaVotou: boolean,
): SituacaoTicket {
  if (comprovante || jaVotou) return { tipo: "votou" };
  if (!estado) return { tipo: "desconhecida" };
  if (estado.naCabine?.id === ticket.id) return { tipo: "na-cabine" };

  const eu = [...estado.preferencial, ...estado.comum].find((u) => u.id === ticket.id);
  if (eu) return { tipo: "aguardando", posicao: eu.posicaoNaFila, aFrente: eu.aFrente };

  // Com o cache local não dá para afirmar que saiu da fila; espera o servidor.
  return sincronizado ? { tipo: "fora" } : { tipo: "desconhecida" };
}
