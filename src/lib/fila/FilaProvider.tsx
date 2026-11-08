"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { FilaSocket, urlDoServidor } from "./FilaSocket";
import {
  CHAVE_COMPROVANTE,
  CHAVE_TICKET,
  gravarComprovante,
  gravarEstado,
  gravarTicket,
  lerComprovante,
  lerEstado,
  lerTicket,
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
  // O estado inicial vem do localStorage: o F5 já abre com a última fila
  // conhecida, a senha do eleitor e o comprovante do voto. No servidor é null;
  // quem lê esses dados fica dentro de <SoNoNavegador>, sem erro de hidratação.
  const [estado, setEstado] = useState<FilaEstado | null>(() => (noNavegador ? lerEstado() : null));
  const [meuTicket, setMeuTicket] = useState<Ticket | null>(() => (noNavegador ? lerTicket() : null));
  const [comprovante, setComprovante] = useState<Comprovante | null>(() => (noNavegador ? lerComprovante() : null));
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

    const atualizarResultado = () =>
      api<ContagemCandidato[]>("/resultados")
        .then((r) => setResultado(r.data))
        .catch((err: unknown) => setErroResultado(err instanceof Error ? err.message : "Falha ao buscar resultados"));

    const pararEstado = socket.onEstado((novo) => {
      setEstado(novo);
      setSincronizado(true);
      gravarEstado(novo);
    });
    const pararStatus = socket.onStatus((novo) => {
      setStatus(novo);
      if (novo !== "conectado") setSincronizado(false);
      else void atualizarResultado();
    });
    const pararVoto = socket.onVoto(() => void atualizarResultado());
    socket.conectar();

    // Mantém senha e comprovante iguais entre abas abertas.
    const aoMudarStorage = (ev: StorageEvent) => {
      if (ev.key === CHAVE_TICKET) setMeuTicket(lerTicket());
      if (ev.key === CHAVE_COMPROVANTE) setComprovante(lerComprovante());
    };
    window.addEventListener("storage", aoMudarStorage);

    return () => {
      pararEstado();
      pararStatus();
      pararVoto();
      window.removeEventListener("storage", aoMudarStorage);
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
      const usuario = await pedir<Usuario & { chave: string }>("fila:entrar", { nome, tipoFila });
      const ticket: Ticket = { ...usuario, emitidoEm: new Date().toISOString() };
      definirComprovante(null);
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
      const r = await api<ResultadoVoto>("/votos", {
        method: "POST",
        body: { usuarioId: meuTicket.id, chave: meuTicket.chave, candidatoId },
      });
      const novo: Comprovante = { ...r.data, tempoRequisicaoMs: r.tempoMs };
      definirComprovante(novo);
      setResultado(r.data.resultado);
      return novo;
    },
    [meuTicket, definirComprovante, setResultado],
  );

  const concluir = useCallback(() => {
    definirComprovante(null);
    definirTicket(null);
  }, [definirComprovante, definirTicket]);

  const situacao = useMemo(
    () => (meuTicket ? calcularSituacao(estado, meuTicket, comprovante, sincronizado) : null),
    [estado, meuTicket, comprovante, sincronizado],
  );

  const valor = useMemo<FilaContexto>(
    () => ({
      estado,
      status,
      sincronizado,
      meuTicket,
      situacao,
      comprovante,
      resultado,
      resultadoEm,
      erroResultado,
      entrar,
      sairDaFila,
      votar,
      concluir,
    }),
    [estado, status, sincronizado, meuTicket, situacao, comprovante, resultado, resultadoEm, erroResultado, entrar, sairDaFila, votar, concluir],
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
): SituacaoTicket {
  if (comprovante) return { tipo: "votou" };
  if (!estado) return { tipo: "desconhecida" };
  if (estado.naCabine?.id === ticket.id) return { tipo: "na-cabine" };

  const eu = [...estado.preferencial, ...estado.comum].find((u) => u.id === ticket.id);
  if (eu) return { tipo: "aguardando", posicao: eu.posicaoNaFila, aFrente: eu.aFrente };

  // Com o cache local não dá para afirmar que saiu da fila; espera o servidor.
  return sincronizado ? { tipo: "fora" } : { tipo: "desconhecida" };
}
