"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { Aviso, Botao, Cartao, FotoCandidato, Senha, corCandidato, mensagemDeErro } from "@/components/ui";
import { api } from "@/lib/api";
import { useFila } from "@/lib/fila/FilaProvider";
import { useIrParaDestino } from "@/lib/fila/destino";
import { duracao, ehNulo, type Candidato } from "@/lib/fila/tipos";

export default function VotarPage() {
  return (
    <SoNoNavegador>
      <Cabine />
    </SoNoNavegador>
  );
}

function Cabine() {
  const { meuTicket, situacao, estado, votar } = useFila();
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Só fica aqui quem está na cabine; depois do voto vai para os resultados parciais.
  useIrParaDestino("/votar");

  useEffect(() => {
    api<Candidato[]>("/candidatos")
      .then((r) => setCandidatos(r.data))
      .catch((err) => setErro(mensagemDeErro(err)));
  }, []);

  if (!meuTicket || situacao?.tipo !== "na-cabine") {
    return <p className="text-muted text-center py-20">Verificando a sua vez…</p>;
  }

  const escolha = candidatos?.find((c) => c.id === escolhido);

  async function confirmar() {
    if (!escolha) return;
    if (!confirm(ehNulo(escolha) ? "Confirmar voto nulo?" : `Confirmar voto em ${escolha.nome}?`)) return;
    setErro(null);
    setEnviando(true);
    try {
      await votar(escolha.id);
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
          <p className="text-muted">
            <Senha usuario={meuTicket} /> · {meuTicket.nome}
          </p>
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
              onClick={() => setEscolhido(c.id)}
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
              onClick={() => setEscolhido(c.id)}
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

      <Cartao className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted">
          {escolha ? (
            <>
              Seu voto: <strong className="text-foreground">{ehNulo(escolha) ? "Nulo" : escolha.nome}</strong>
            </>
          ) : (
            "Nenhum candidato selecionado"
          )}
        </p>
        <Botao className="ml-auto px-8 py-3 text-base" disabled={!escolha || enviando} onClick={confirmar}>
          {enviando ? "Registrando voto…" : "Votar"}
        </Botao>
      </Cartao>
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
