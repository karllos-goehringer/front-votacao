"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { Aviso, Cartao, FotoCandidato, Senha, corCandidato } from "@/components/ui";
import { api } from "@/lib/api";
import { useFila } from "@/lib/fila/FilaProvider";
import { duracao, ehNulo, horario, type Candidato, type ContagemCandidato } from "@/lib/fila/tipos";

/**
 * Resultados parciais (GET /resultados). Pública: qualquer um pode ver.
 * Quem acabou de votar chega aqui sozinho e vê também o comprovante + Concluir.
 */
export default function ResultadosPage() {
  return (
    <SoNoNavegador fallback={<p className="text-muted text-center py-20">Carregando resultados…</p>}>
      <Resultados />
    </SoNoNavegador>
  );
}

function Resultados() {
  const { resultado, resultadoEm, erroResultado, comprovante, status, sincronizado } = useFila();
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);

  useEffect(() => {
    api<Candidato[]>("/candidatos")
      .then((r) => setCandidatos(r.data))
      .catch(() => null);
  }, []);

  const votouEm = comprovante?.voto.candidatoId;
  // Enquanto o primeiro GET não volta, quem votou já tem o resultado do momento do voto.
  const dados = resultado ?? comprovante?.resultado ?? null;
  const aoVivo = status === "conectado" && sincronizado;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Resultados parciais</h1>
          <p className="text-muted">Quantidade de votos de cada candidato até agora.</p>
        </div>
        <p className="ml-auto flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <span className={`size-2 rounded-full ${aoVivo ? "bg-success" : "bg-preferencial animate-pulse"}`} />
          {aoVivo ? "ao vivo" : "reconectando…"}
          {dados && <> · {total(dados)} {total(dados) === 1 ? "voto" : "votos"}</>}
        </p>
      </div>

      {erroResultado && (
        <Aviso>
          {erroResultado}
          {dados && " Mostrando o último resultado conhecido."}
        </Aviso>
      )}

      {!dados ? (
        !erroResultado && <p className="text-muted text-center py-16">Carregando resultados…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {dados.filter((c) => !ehNulo(c)).map((c) => (
              <CartaoCandidato key={c.candidatoId} candidato={c} total={total(dados)} seuVoto={c.candidatoId === votouEm} />
            ))}
            {dados.filter(ehNulo).map((c) => (
              <CartaoNulo key={c.candidatoId} contagem={c} total={total(dados)} seuVoto={c.candidatoId === votouEm} />
            ))}
          </div>
          <Resumo dados={dados} atualizadoEm={resultadoEm} />
        </>
      )}

      {comprovante ? <Comprovante candidatos={candidatos} /> : <AcoesVisitante />}
    </div>
  );
}

const total = (dados: ContagemCandidato[]) => dados.reduce((s, c) => s + c.votos, 0);

function CartaoCandidato({ candidato: c, total, seuVoto }: { candidato: ContagemCandidato; total: number; seuVoto: boolean }) {
  const cor = corCandidato(c.candidatoId);
  const pct = total ? (c.votos / total) * 100 : 0;
  return (
    <section
      className={`rounded-2xl border-2 bg-card p-5 ${seuVoto ? `${cor.borda} ring-4 ${cor.anel}` : "border-border"}`}
    >
      <div className="flex items-center gap-4">
        <FotoCandidato id={c.candidatoId} nome={c.nome} urlFoto={c.urlFoto} className="size-16 text-3xl" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{c.nome}</h2>
          {c.partido && (
            <p className="text-sm text-muted">
              {c.partido.nome} · <span className="font-mono">{c.partido.digito}</span>
            </p>
          )}
          {seuVoto && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${cor.suave} ${cor.texto}`}>
              seu voto
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className={`text-5xl font-bold tabular-nums ${cor.texto}`}>{c.votos}</span>
        <span className="text-muted">{c.votos === 1 ? "voto" : "votos"}</span>
        <span className="ml-auto text-xl font-semibold tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div
        className="mt-2 h-3 rounded-full bg-background overflow-hidden"
        role="meter"
        aria-label={`Votos de ${c.nome}`}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${cor.fundo} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

/** Voto nulo: faixa neutra de largura total, abaixo dos candidatos. */
function CartaoNulo({ contagem: c, total, seuVoto }: { contagem: ContagemCandidato; total: number; seuVoto: boolean }) {
  const pct = total ? (c.votos / total) * 100 : 0;
  return (
    <section
      className={`sm:col-span-2 rounded-2xl border-2 p-4 ${seuVoto ? "border-nulo bg-nulo-soft ring-4 ring-nulo/20" : "border-dashed border-border bg-card"
        }`}
    >
      <div className="flex items-center gap-3">
        <FotoCandidato id={c.candidatoId} nome={c.nome} nulo className="size-10 text-2xl shrink-0" />
        <h2 className="font-semibold">Votos nulos</h2>
        {seuVoto && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-card text-nulo border border-border">seu voto</span>
        )}
        <p className="ml-auto flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-nulo">{c.votos}</span>
          <span className="text-sm text-muted tabular-nums">{pct.toFixed(0)}%</span>
        </p>
      </div>
      <div
        className="mt-3 h-2 rounded-full bg-background overflow-hidden"
        role="meter"
        aria-label="Votos nulos"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-nulo transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function Resumo({ dados, atualizadoEm }: { dados: ContagemCandidato[]; atualizadoEm: string | null }) {
  const soma = total(dados);
  // Nulo não "lidera": a disputa é só entre candidatos.
  const ordenados = dados.filter((c) => !ehNulo(c)).sort((a, b) => b.votos - a.votos);
  const [primeiro, segundo] = ordenados;

  let texto: string;
  if (soma === 0) texto = "Ninguém votou ainda.";
  else if (!primeiro || primeiro.votos === 0) texto = "Nenhum voto válido ainda.";
  else if (!segundo || primeiro.votos !== segundo.votos)
    texto = `Quem está na frente: ${primeiro.nome}${segundo ? ` (+${primeiro.votos - segundo.votos})` : ""}`;
  else texto = "Empate.";

  return (
    <p className="text-sm text-muted flex flex-wrap gap-x-3">
      <span className="text-foreground font-medium">{texto}</span>
      {atualizadoEm && <span>Atualizado às {horario(atualizadoEm)}</span>}
    </p>
  );
}

function Comprovante({ candidatos }: { candidatos?: Candidato[] | null }) {
  const { comprovante, resultado } = useFila();
  if (!comprovante) return null;
  const { voto } = comprovante;

  // Busca dados completos do candidato para exibir foto, partido e número
  const candidatoInfo = candidatos?.find((c) => c.id === voto.candidatoId);
  const listaCandidatos = comprovante.resultado?.length > 0 ? comprovante.resultado : (resultado ?? []);
  const contagem = listaCandidatos.find((c) => c.candidatoId === voto.candidatoId);

  const nulo =
    voto.candidatoId === 1 ||
    (candidatoInfo ? ehNulo(candidatoInfo) : contagem ? ehNulo(contagem) : false);
  const urlFoto = candidatoInfo?.urlFoto ?? contagem?.urlFoto ?? null;
  const partido = candidatoInfo?.partido ?? contagem?.partido ?? null;
  const nomeCandidato = nulo
    ? "Voto Nulo"
    : (candidatoInfo?.nome || contagem?.nome || voto.candidatoNome || "Candidato");

  return (
    <Cartao className="border-2 border-border/90 bg-card p-5 sm:p-6 shadow-sm">
      {/* Cabeçalho do comprovante com status responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-bold text-lg sm:text-xl tracking-tight text-foreground">
              Comprovante de votação
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Voto autenticado e registrado com sucesso na urna eletrônica
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr] items-start">
        {/* Identificação visual do candidato ou voto nulo */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-background/70 border border-border/80 w-full">
          <FotoCandidato
            id={voto.candidatoId}
            nome={nomeCandidato}
            urlFoto={urlFoto}
            nulo={nulo}
            className="size-16 sm:size-18 text-3xl shrink-0 aspect-square"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {nulo ? "Opção escolhida" : "Candidato escolhido"}
            </p>
            <p className="font-bold truncate text-base sm:text-lg text-foreground">
              {nomeCandidato}
            </p>
            {!nulo && partido ? (
              <p className="text-xs text-muted truncate">
                {partido.nome} · <strong className="font-mono text-foreground font-semibold">{partido.digito}</strong>
              </p>
            ) : nulo ? (
              <p className="text-xs text-muted">
                Voto não computado para nenhum candidato
              </p>
            ) : null}
          </div>
        </div>

        {/* Detalhes de auditoria do voto */}
        <dl className="divide-y divide-border text-sm">
          <Linha rotulo="Eleitor">
            <Senha usuario={voto} /> {voto.usuarioNome}
          </Linha>
          <Linha rotulo="Horário do voto">{horario(voto.votouEm)}</Linha>
          <Linha rotulo="Tempo para votar">{duracao(voto.tempoParaVotarMs)}</Linha>
          <Linha rotulo="Da entrada na fila até a cabine">{duracao(voto.tempoNaFilaMs)}</Linha>
        </dl>
      </div>
    </Cartao>
  );
}

function AcoesVisitante() {
  const { meuTicket, jaVotou, comprovante } = useFila();
  if (jaVotou || Boolean(comprovante)) {
    return (
      <div className="rounded-xl border border-border/80 bg-card p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ✓ Seu voto foi registrado com sucesso nesta eleição. A apuração acima é atualizada em tempo real.
        </p>
      </div>
    );
  }
  const classe = "rounded-lg px-5 py-2.5 text-sm font-medium transition";
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/entrar" className={`${classe} bg-primary text-primary-foreground hover:opacity-90`}>
        {meuTicket ? "Voltar para a fila" : "Entrar na fila"}
      </Link>
      <Link href="/" className={`${classe} border border-border bg-card hover:bg-background`}>
        Voltar ao início
      </Link>
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="ml-auto text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}
