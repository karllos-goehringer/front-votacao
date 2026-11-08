"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ListaFila } from "@/components/ListaFila";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { Aviso, BarrasResultado, Botao, Cartao, EtiquetaFila, Senha, mensagemDeErro } from "@/components/ui";
import { useAdmin } from "@/lib/admin/AdminProvider";
import { useFila } from "@/lib/fila/FilaProvider";
import {
  duracao,
  horario,
  normalizarContagem,
  senha,
  type ContagemCandidato,
  type TipoFila,
  type Usuario,
  type UsuarioNaFila,
  type Voto,
} from "@/lib/fila/tipos";

export default function AdminPage() {
  return (
    <SoNoNavegador>
      <Admin />
    </SoNoNavegador>
  );
}

interface UltimaAcao {
  metodo: string;
  rota: string;
  ok: boolean;
  tempoMs?: number;
  corpo: string;
  /** Frase curta com o resultado, para não precisar ler o JSON. */
  resumo?: string;
}

/** Respostas dos métodos do TAD Fila em /api/v1/filas/:tipoFila. */
interface RespPrimeiro {
  primeiro: Usuario | null;
  vazia: boolean;
}
interface RespVazia {
  vazia: boolean;
  tamanho: number;
}
interface RespExibir {
  exibicao: string;
  tamanho: number;
  vazia: boolean;
}
interface RespPosicao {
  posicaoFila: number;
}
interface RespInverter {
  tamanhoAtual: number;
  exibicao: string;
}

type OperacaoFila = "primeiro" | "vazia" | "exibir" | "inverter" | "limpar";

const NOME_FILA = { PREFERENCIAL: "preferencial", COMUM: "comum" } as const;

function Admin() {
  const { sessao, logout, chamar } = useAdmin();
  const { estado, resultado } = useFila();
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [ultima, setUltima] = useState<UltimaAcao | null>(null);
  const [relatorio, setRelatorio] = useState<Voto[] | null>(null);
  const [contagem, setContagem] = useState<ContagemCandidato[] | null>(null);

  useEffect(() => {
    if (!sessao) router.replace("/admin/login");
  }, [sessao, router]);

  /** Chama um método da API e mostra a resposta (ou o erro) na tela. */
  const executar = useCallback(
    async <T,>(metodo: string, rota: string, aoReceber?: (data: T) => void, resumir?: (data: T) => string) => {
      setOcupado(true);
      try {
        const r = await chamar<T>(rota, metodo);
        aoReceber?.(r.data);
        setUltima({
          metodo,
          rota,
          ok: true,
          tempoMs: r.tempoMs,
          corpo: JSON.stringify(r.data, null, 2),
          resumo: resumir?.(r.data),
        });
      } catch (err) {
        setUltima({ metodo, rota, ok: false, corpo: mensagemDeErro(err) });
      } finally {
        setOcupado(false);
      }
    },
    [chamar],
  );

  const carregarRelatorio = useCallback(
    () => executar<Voto[]>("GET", "/votos", setRelatorio),
    [executar],
  );

  // O relatório e a contagem acompanham os votos que chegam pelo WebSocket.
  useEffect(() => {
    if (!sessao) return;
    chamar<Voto[]>("/votos")
      .then((r) => setRelatorio(r.data))
      .catch(() => undefined);
  }, [sessao, chamar, resultado]);

  if (!sessao) return null;

  function sair() {
    logout();
    router.replace("/admin/login");
  }

  const aguardando = estado ? estado.preferencial.length + estado.comum.length : 0;

  const remover = (u: UsuarioNaFila) => {
    if (confirm(`Tirar ${senha(u)} (${u.nome}) da fila?`)) void executar("DELETE", `/fila/${u.id}`);
  };

  // ---- Métodos do TAD Fila (/api/v1/filas/:tipoFila/...) para cada fila.
  // Leituras consultam a fila que está na tela; alterações só valem na fila de demonstração (o back protege a real).
  const escopoLeitura = estado?.modoMock ? "mock" : "real";
  const baseFila = (tipo: TipoFila) => `/api/v1/filas/${NOME_FILA[tipo]}`;
  const rotuloFila = (tipo: TipoFila) => `fila ${NOME_FILA[tipo]}`;

  /** O back bloqueia alterações na fila real: avisa que a operação vai para a fila de demonstração. */
  const confirmarAlteracao = (texto: string) =>
    confirm(
      estado?.modoMock
        ? texto
        : `${texto}\n\nAtenção: a fila real é protegida. A operação será feita na fila de DEMONSTRAÇÃO e o painel passará a exibi-la.`,
    );

  const tad: Record<OperacaoFila, (tipo: TipoFila) => void> = {
    primeiro: (tipo) =>
      void executar<RespPrimeiro>(
        "GET",
        `${baseFila(tipo)}/elementos/primeiro?escopo=${escopoLeitura}`,
        undefined,
        (d) =>
          d.primeiro
            ? `Primeiro da ${rotuloFila(tipo)}: ${senha(d.primeiro)} — ${d.primeiro.nome}`
            : `A ${rotuloFila(tipo)} está vazia: não há primeiro elemento.`,
      ),
    vazia: (tipo) =>
      void executar<RespVazia>("GET", `${baseFila(tipo)}/status?escopo=${escopoLeitura}`, undefined, (d) =>
        d.vazia
          ? `Sim, a ${rotuloFila(tipo)} está vazia.`
          : `Não, a ${rotuloFila(tipo)} tem ${d.tamanho} ${d.tamanho === 1 ? "elemento" : "elementos"}.`,
      ),
    exibir: (tipo) =>
      void executar<RespExibir>("GET", `${baseFila(tipo)}/elementos?escopo=${escopoLeitura}`, undefined, (d) =>
        d.vazia ? `A ${rotuloFila(tipo)} está vazia.` : `${d.tamanho} na ${rotuloFila(tipo)}: ${d.exibicao}`,
      ),
    inverter: (tipo) => {
      if (!confirmarAlteracao(`Inverter a ordem da ${rotuloFila(tipo)}?`)) return;
      void executar<RespInverter>("POST", `${baseFila(tipo)}/inversao?escopo=mock`, undefined, (d) =>
        d.tamanhoAtual === 0 ? `A ${rotuloFila(tipo)} está vazia; nada a inverter.` : `Nova ordem: ${d.exibicao}`,
      );
    },
    limpar: (tipo) => {
      if (!confirmarAlteracao(`Apagar TODOS os elementos da ${rotuloFila(tipo)}?`)) return;
      void executar("DELETE", `${baseFila(tipo)}/elementos?escopo=mock`, undefined, () => `A ${rotuloFila(tipo)} foi esvaziada.`);
    },
  };

  const posicaoDe = (u: UsuarioNaFila) =>
    void executar<RespPosicao>(
      "GET",
      `${baseFila(u.tipoFila)}/elementos/${u.id}/posicao?escopo=${escopoLeitura}`,
      undefined,
      (d) => `${senha(u)} (${u.nome}) está na ${d.posicaoFila}ª posição da ${rotuloFila(u.tipoFila)}.`,
    );

  const ACOES: Array<{ rotulo: string; metodo: string; rota: string; acao: () => void; desabilitar?: boolean; dica: string }> = [
    { rotulo: "Ver fila", metodo: "GET", rota: "/fila", acao: () => void executar("GET", "/fila"), dica: "Estado completo das filas e da cabine" },
    { rotulo: "Posições", metodo: "GET", rota: "/fila/posicoes", acao: () => void executar("GET", "/fila/posicoes"), dica: "Posição atual de todos e quem pode votar" },
    {
      rotulo: "Chamar próximo",
      metodo: "POST",
      rota: "/fila/proximo",
      acao: () => void executar("POST", "/fila/proximo"),
      desabilitar: !!estado?.naCabine || aguardando === 0,
      dica: "proximoAVotar(): manda o próximo para a cabine",
    },
    {
      rotulo: "Liberar cabine",
      metodo: "POST",
      rota: "/fila/liberar",
      acao: () => void executar("POST", "/fila/liberar"),
      desabilitar: !estado?.naCabine,
      dica: "Tira quem está na cabine sem voto",
    },
    { rotulo: "Encher fila (+30)", metodo: "POST", rota: "/fila/mock", acao: () => void executar("POST", "/fila/mock"), dica: "Coloca 30 pessoas de demonstração na fila; elas votam sozinhas quando chamadas" },
    {
      rotulo: "Reiniciar do zero",
      metodo: "POST",
      rota: "/fila/reiniciar",
      acao: () => {
        if (confirm("Recomeçar do zero? Apaga a fila, a cabine e TODOS os votos, e enche a fila de novo.")) {
          void executar("POST", "/fila/reiniciar");
        }
      },
      dica: "Esvazia filas e cabine, apaga os votos, volta as senhas para P001/C001 e enche a fila de novo",
    },
    {
      rotulo: "Resultados parciais",
      metodo: "GET",
      rota: "/resultados",
      acao: () => void executar<unknown>("GET", "/resultados", (d) => setContagem(normalizarContagem(d))),
      dica: "Array dos candidatos com o total de votos de cada um",
    },
    { rotulo: "Relatório de votos", metodo: "GET", rota: "/votos", acao: () => void carregarRelatorio(), dica: "Quem votou em quem, horário e tempos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
          <p className="text-muted">
            {aguardando} aguardando · {estado?.preferencial.length ?? 0} preferencial · {estado?.comum.length ?? 0} comum
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted">Logado como {sessao.nome}</span>
          <Botao variante="secundario" onClick={sair}>
            Sair
          </Botao>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem] items-start">
        <ControleCabine
          naCabine={estado?.naCabine ?? null}
          proximo={estado ? (estado.preferencial[0] ?? estado.comum[0] ?? null) : null}
          aguardando={aguardando}
          ocupado={ocupado}
          chamar={() => void executar("POST", "/fila/proximo")}
          liberar={() => void executar("POST", "/fila/liberar")}
          encher={() => void executar("POST", "/fila/mock")}
        />
        <Cartao>
          <h2 className="font-semibold mb-3">Votos por candidato</h2>
          {resultado || contagem ? (
            <BarrasResultado resultado={resultado ?? contagem!} />
          ) : (
            <p className="text-sm text-muted">Carregando…</p>
          )}
        </Cartao>
      </div>

      <Cartao>
        <h2 className="font-semibold mb-3">Métodos da API</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ACOES.map((a) => (
            <button
              key={a.rota + a.metodo}
              onClick={a.acao}
              disabled={ocupado || a.desabilitar}
              title={a.dica}
              className="text-left rounded-lg border border-border bg-background px-3 py-2.5 hover:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="block text-sm font-medium">{a.rotulo}</span>
              <span className="block font-mono text-xs text-muted">
                {a.metodo} {a.rota}
              </span>
            </button>
          ))}
        </div>

        {ultima && (
          <div className="mt-4">
            <p className="text-xs text-muted mb-1">
              <span className="font-mono">
                {ultima.metodo} {ultima.rota}
              </span>{" "}
              · {ultima.ok ? "ok" : "erro"}
              {ultima.tempoMs !== undefined && ` · requisição levou ${duracao(ultima.tempoMs)}`}
            </p>
            {ultima.ok && ultima.resumo && (
              <p className="mb-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium">
                {ultima.resumo}
              </p>
            )}
            {ultima.ok ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-background p-3 text-xs font-mono">{ultima.corpo}</pre>
            ) : (
              <Aviso>{ultima.corpo}</Aviso>
            )}
          </div>
        )}
      </Cartao>

      {estado && (
        <div className="grid gap-4 md:grid-cols-2">
          {(["PREFERENCIAL", "COMUM"] as const).map((tipo) => (
            <ListaFila
              key={tipo}
              tipo={tipo}
              usuarios={tipo === "PREFERENCIAL" ? estado.preferencial : estado.comum}
              ferramentas={
                <FerramentasFila
                  tipo={tipo}
                  ocupado={ocupado}
                  vazia={(tipo === "PREFERENCIAL" ? estado.preferencial : estado.comum).length === 0}
                  tad={tad}
                />
              }
              acao={(u) => (
                <span className="flex items-center gap-3">
                  <button
                    onClick={() => posicaoDe(u)}
                    disabled={ocupado}
                    title="posicaoDe(): verifica a posição deste elemento na fila"
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Posição
                  </button>
                  <button
                    onClick={() => remover(u)}
                    disabled={ocupado}
                    className="text-xs text-danger hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                </span>
              )}
            />
          ))}
        </div>
      )}

      <Cartao>
        <h2 className="font-semibold mb-3">Relatório de votos</h2>
        {!relatorio ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : relatorio.length === 0 ? (
          <p className="text-sm text-muted">Ninguém votou ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Senha</th>
                  <th className="py-2 pr-3 font-medium">Eleitor</th>
                  <th className="py-2 pr-3 font-medium">Votou em</th>
                  <th className="py-2 pr-3 font-medium">Horário</th>
                  <th className="py-2 pr-3 font-medium text-right">Tempo para votar</th>
                  <th className="py-2 font-medium text-right">Fila até a cabine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {relatorio.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 pr-3">
                      <Senha usuario={v} />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{v.usuarioNome}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{v.candidatoNome}</td>
                    <td className="py-2 pr-3 tabular-nums">{horario(v.votouEm)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{duracao(v.tempoParaVotarMs)}</td>
                    <td className="py-2 text-right tabular-nums">{duracao(v.tempoNaFilaMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}

/** Botões dos métodos do TAD Fila mostrados no topo de cada fila. */
function FerramentasFila({
  tipo,
  ocupado,
  vazia,
  tad,
}: {
  tipo: TipoFila;
  ocupado: boolean;
  vazia: boolean;
  tad: Record<OperacaoFila, (tipo: TipoFila) => void>;
}) {
  const botoes: Array<{ op: OperacaoFila; rotulo: string; dica: string; perigo?: boolean; precisaElementos?: boolean }> = [
    { op: "primeiro", rotulo: "Primeiro", dica: "primeiro(): mostra quem está na frente da fila" },
    { op: "vazia", rotulo: "Está vazia?", dica: "estaVazia(): verifica se a fila não tem elementos" },
    { op: "exibir", rotulo: "Exibir", dica: "exibir(): lista os elementos da fila em ordem" },
    { op: "inverter", rotulo: "Inverter", dica: "inverter(): inverte a ordem dos elementos da fila", precisaElementos: true },
    { op: "limpar", rotulo: "Apagar todos", dica: "limpar(): remove todos os elementos da fila", perigo: true, precisaElementos: true },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {botoes.map((b) => (
        <button
          key={b.op}
          onClick={() => tad[b.op](tipo)}
          disabled={ocupado || (b.precisaElementos && vazia)}
          title={b.dica}
          className={`rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
            b.perigo ? "text-danger hover:bg-danger-soft" : "hover:border-primary"
          }`}
        >
          {b.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Centro do painel: quem está na cabine e o botão para chamar o próximo da fila. */
function ControleCabine({
  naCabine,
  proximo,
  aguardando,
  ocupado,
  chamar,
  liberar,
  encher,
}: {
  naCabine: Usuario | null;
  proximo: UsuarioNaFila | null;
  aguardando: number;
  ocupado: boolean;
  chamar: () => void;
  liberar: () => void;
  encher: () => void;
}) {
  return (
    <Cartao className={naCabine ? "border-primary" : ""}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-2.5 rounded-full ${naCabine ? "bg-primary animate-pulse" : "bg-success"}`} />
        <h2 className="font-semibold">Cabine de votação</h2>
        <span className="ml-auto text-sm text-muted tabular-nums">
          {aguardando} {aguardando === 1 ? "pessoa" : "pessoas"} na fila
        </span>
      </div>

      {naCabine ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">Votando agora…</p>
            <p className="flex items-center gap-3 mt-1">
              <Senha usuario={naCabine} className="text-3xl" />
              <span className="truncate text-lg font-medium">{naCabine.nome}</span>
              <EtiquetaFila tipo={naCabine.tipoFila} />
            </p>
            <p className="text-xs text-muted mt-1">
              {naCabine.mock
                ? "Pessoa de demonstração: vota sozinha em alguns segundos."
                : "Eleitor real: está escolhendo o candidato no celular/navegador dele."}
            </p>
          </div>
          <Botao variante="secundario" className="ml-auto" disabled={ocupado} onClick={liberar} title="Tira da cabine sem registrar voto">
            Liberar cabine
          </Botao>
        </div>
      ) : proximo ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-success">Cabine livre — chame o próximo</p>
            <p className="flex items-center gap-3 mt-1 text-muted">
              Próximo: <Senha usuario={proximo} className="text-xl" />
              <span className="truncate text-foreground">{proximo.nome}</span>
              <EtiquetaFila tipo={proximo.tipoFila} />
            </p>
          </div>
          <Botao className="ml-auto px-8 py-3 text-base" disabled={ocupado} onClick={chamar}>
            Chamar próximo
          </Botao>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-muted">Cabine livre e ninguém na fila.</p>
          <Botao className="ml-auto" disabled={ocupado} onClick={encher}>
            Encher fila (+30)
          </Botao>
        </div>
      )}
    </Cartao>
  );
}
