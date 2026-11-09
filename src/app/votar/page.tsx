"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { Aviso, BotaoConfirmaUrna, FotoCandidato, Senha, corCandidato, mensagemDeErro } from "@/components/ui";
import { api } from "@/lib/api";
import { useFila } from "@/lib/fila/FilaProvider";
import { useIrParaDestino } from "@/lib/fila/destino";
import { duracao, ehNulo, type Candidato } from "@/lib/fila/tipos";
import { tocarBeepUrna, tocarSomUrna } from "@/lib/urnaAudio";

export default function VotarPage() {
  return (
    <SoNoNavegador>
      <CabineContainer />
    </SoNoNavegador>
  );
}

function CabineContainer() {
  const { meuTicket, estado } = useFila();
  // Chave única por ticket e chamada garante que cada eleitor sempre receba uma Cabine limpa
  // (sem candidato pré-selecionado nem botão CONFIRMA travado em "GRAVANDO…" do Router Cache).
  const chaveSessao = meuTicket
    ? `${meuTicket.id}-${meuTicket.tipoFila}-${meuTicket.senha}-${meuTicket.chave}-${estado?.naCabine?.chamadoEm ?? ""}`
    : "sem-ticket";
  return <Cabine key={chaveSessao} />;
}

function Cabine() {
  const { meuTicket, situacao, estado, votar } = useFila();
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [prontoParaInteragir, setProntoParaInteragir] = useState(false);

  // Só fica aqui quem está na cabine; depois do voto vai para os resultados parciais.
  useIrParaDestino("/votar", ["/votar", "/resultados"]);

  // Protege contra clique fantasma (touch bleed-through) imediatamente na transição de tela para a cabine
  useEffect(() => {
    const timer = setTimeout(() => setProntoParaInteragir(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    api<Candidato[]>("/candidatos")
      .then((r) => setCandidatos(r.data))
      .catch((err) => setErro(mensagemDeErro(err)));
  }, []);

  if ((!meuTicket || situacao?.tipo !== "na-cabine") && !enviando) {
    return <p className="text-muted text-center py-20">Verificando a sua vez…</p>;
  }

  const escolha = candidatos?.find((c) => c.id === escolhido);
  const eleitorCabine = meuTicket ?? estado?.naCabine ?? null;

  function selecionar(id: number) {
    if (enviando || !prontoParaInteragir) return;
    setEscolhido(id);
    void tocarBeepUrna();
  }

  async function confirmar() {
    if (!escolha || enviando || !prontoParaInteragir) return;
    setErro(null);
    setEnviando(true);

    // Reproduz o som característico da urna imediatamente no clique (gesto do usuário)
    void tocarSomUrna();

    try {
      // Computa o voto no backend e aguarda a reprodução do som para a experiência completa
      await Promise.all([
        votar(escolha.id),
        new Promise((resolve) => setTimeout(resolve, 920)),
      ]);
      setEnviando(false);
      setEscolhido(null);
      router.replace("/resultados");
    } catch (err) {
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cabine de votação</h1>
          {eleitorCabine && (
            <p className="text-muted">
              <Senha usuario={eleitorCabine} /> · {eleitorCabine.nome}
            </p>
          )}
        </div>
        <Cronometro desde={estado?.naCabine?.chamadoEm ?? null} />
      </div>

      <p className="text-lg">Escolha o seu candidato:</p>

      {!candidatos && !erro && <p className="text-muted">Carregando candidatos…</p>}

      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Candidatos">
        {candidatos?.filter((c) => !ehNulo(c)).map((c) => {
          const cor = corCandidato(c.id);
          const marcado = escolhido === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => selecionar(c.id)}
              disabled={enviando}
              className={`rounded-2xl border-2 bg-card p-6 text-center transition ${
                marcado ? `${cor.borda} ring-4 ${cor.anel}` : "border-border hover:border-muted"
              }`}
            >
              <FotoCandidato id={c.id} nome={c.nome} urlFoto={c.urlFoto} className="size-28 text-6xl mx-auto" />
              <p className="mt-4 text-xl font-semibold">{c.nome}</p>
              <p className="text-sm text-muted">{c.partido?.nome}</p>
              <p className={`mt-2 font-mono text-3xl font-bold tabular-nums ${cor.texto}`}>{c.partido?.digito}</p>
            </button>
          );
        })}

        {/* Voto nulo: opção à parte, neutra e menos chamativa que os candidatos. */}
        {candidatos?.filter(ehNulo).map((c) => {
          const marcado = escolhido === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => selecionar(c.id)}
              disabled={enviando}
              className={`sm:col-span-2 flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
                marcado ? "border-nulo bg-nulo-soft ring-4 ring-nulo/20" : "border-dashed border-border bg-card hover:border-muted"
              }`}
            >
              <FotoCandidato id={c.id} nome={c.nome} nulo className="size-12 text-3xl shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold">Votar nulo</span>
                <span className="block text-sm text-muted">Anula o seu voto: ele não conta para nenhum candidato.</span>
              </span>
            </button>
          );
        })}
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="rounded-2xl border-2 border-border bg-card p-5 sm:p-6 shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {escolha ? (
              <div className="flex items-center gap-3.5 min-w-0">
                <FotoCandidato
                  id={escolha.id}
                  nome={escolha.nome}
                  urlFoto={escolha.urlFoto}
                  nulo={ehNulo(escolha)}
                  className="size-14 text-2xl shrink-0 aspect-square"
                />
                <div className="min-w-0">
                  <p className="text-xs uppercase font-bold tracking-wider text-muted">Voto Selecionado</p>
                  <p className="text-lg sm:text-xl font-bold truncate text-foreground">
                    {ehNulo(escolha) ? "Voto Nulo" : escolha.nome}
                  </p>
                  {!ehNulo(escolha) && escolha.partido && (
                    <p className="text-xs text-muted">
                      {escolha.partido.nome} · Número{" "}
                      <strong className="font-mono text-foreground font-bold">{escolha.partido.digito}</strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 text-muted">
                <div className="size-14 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0 text-xl font-bold text-muted/60">
                  ?
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Nenhum candidato selecionado</p>
                  <p className="text-xs text-muted">Toque em um candidato acima para liberar a tecla CONFIRMA</p>
                </div>
              </div>
            )}
          </div>

          <BotaoConfirmaUrna
            disabled={!escolha || enviando}
            carregando={enviando}
            onClick={confirmar}
          />
        </div>
      </div>
    </div>
  );
}

/** Há quanto tempo o eleitor está na cabine. */
function Cronometro({ desde }: { desde: string | null }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!desde) return null;
  return (
    <p className="ml-auto text-sm text-muted tabular-nums" aria-live="off">
      Na cabine há {duracao(Math.max(0, agora - new Date(desde).getTime()))}
    </p>
  );
}
