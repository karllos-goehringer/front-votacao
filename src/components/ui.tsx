"use client";

import { useState, type ReactNode } from "react";
import { ROTULO_FILA, senha, type TipoFila, type Usuario } from "@/lib/fila/tipos";

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>{children}</section>;
}

export function Senha({ usuario, className = "" }: { usuario: Pick<Usuario, "tipoFila" | "senha">; className?: string }) {
  const cor = usuario.tipoFila === "PREFERENCIAL" ? "text-preferencial" : "text-comum";
  return <span className={`font-mono font-semibold tabular-nums ${cor} ${className}`}>{senha(usuario)}</span>;
}

export function EtiquetaFila({ tipo }: { tipo: TipoFila }) {
  const cor = tipo === "PREFERENCIAL" ? "bg-preferencial-soft text-preferencial" : "bg-comum-soft text-comum";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cor}`}>{ROTULO_FILA[tipo]}</span>;
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "info"; children: ReactNode }) {
  const cor = tipo === "erro" ? "bg-danger-soft text-danger" : "bg-background text-muted";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${cor}`}>
      {children}
    </p>
  );
}

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" | "perigo" }) {
  const estilos = {
    primario: "bg-primary text-primary-foreground hover:opacity-90",
    secundario: "border border-border bg-card hover:bg-background",
    perigo: "border border-border bg-card text-danger hover:bg-danger-soft",
  }[variante];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${estilos} ${className}`}
    />
  );
}

export function mensagemDeErro(err: unknown): string {
  return err instanceof Error ? err.message : "Algo deu errado";
}

/** "Candidato A" → "A" */
export function letraCandidato(nome: string): string {
  return nome.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?";
}

const CORES_CANDIDATO = [
  { texto: "text-candidato-a", fundo: "bg-candidato-a", suave: "bg-candidato-a-soft", borda: "border-candidato-a", anel: "ring-candidato-a/20" },
  { texto: "text-candidato-b", fundo: "bg-candidato-b", suave: "bg-candidato-b-soft", borda: "border-candidato-b", anel: "ring-candidato-b/20" },
];

/** Voto nulo é neutro: nunca pode parecer com um candidato. */
const CORES_NULO = { texto: "text-nulo", fundo: "bg-nulo", suave: "bg-nulo-soft", borda: "border-nulo", anel: "ring-nulo/20" };

export function corCandidato(id: number, nulo = false) {
  if (nulo || id === 1) return CORES_NULO;
  // Candidato A (id 2) -> index 0 (Azul), Candidato B (id 3) -> index 1 (Vermelho)
  const index = id >= 2 ? id - 2 : Math.max(0, id - 1);
  return CORES_CANDIDATO[index % CORES_CANDIDATO.length] ?? CORES_CANDIDATO[0];
}

/** Símbolo de "anulado" (círculo cortado), no lugar da foto/letra. */
function IconeNulo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-[0.8em]">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 18.4 18.4 5.6" />
    </svg>
  );
}

/** Sem foto cadastrada: mostra a letra do candidato num círculo. Voto nulo mostra o símbolo ⊘. */
export function FotoCandidato({
  id,
  nome,
  urlFoto,
  nulo = false,
  className = "size-20 text-4xl",
}: {
  id: number;
  nome: string;
  urlFoto?: string | null;
  nulo?: boolean;
  className?: string;
}) {
  const [erroUrl, setErroUrl] = useState<string | null>(null);

  const cor = corCandidato(id, nulo);
  const ehVotoNulo =
    nulo ||
    id === 1 ||
    nome.toLowerCase().includes("nulo") ||
    nome.toLowerCase().includes("anular");

  if (ehVotoNulo) {
    return (
      <span aria-hidden className={`inline-flex items-center justify-center rounded-full shrink-0 aspect-square ${cor.suave} ${cor.texto} ${className}`}>
        <IconeNulo />
      </span>
    );
  }
  if (urlFoto && erroUrl !== urlFoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={urlFoto}
        src={urlFoto}
        alt={nome}
        referrerPolicy="no-referrer"
        onError={() => setErroUrl(urlFoto)}
        className={`rounded-full object-cover shrink-0 aspect-square ${className}`}
      />
    );
  }
  return (
    <span aria-hidden className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 aspect-square ${cor.suave} ${cor.texto} ${className}`}>
      {letraCandidato(nome)}
    </span>
  );
}

/** Quantidade absoluta de votos de cada candidato, com barra proporcional. */
export function BarrasResultado({
  resultado,
  destacarId,
}: {
  resultado: {
    candidatoId: number;
    nome: string;
    partido: { nome: string; digito: string } | null;
    urlFoto?: string | null;
    votos: number;
  }[];
  destacarId?: number;
}) {
  const total = resultado.reduce((s, c) => s + c.votos, 0);
  // Nulos sempre por último, depois dos candidatos.
  const ordenado = [...resultado].sort((a, b) => Number(a.partido === null) - Number(b.partido === null));
  return (
    <div className="space-y-4">
      {ordenado.map((c) => {
        const nulo = c.partido === null;
        const cor = corCandidato(c.candidatoId, nulo);
        const pct = total ? (c.votos / total) * 100 : 0;
        return (
          <div key={c.candidatoId}>
            <div className="flex items-center gap-3 mb-1.5">
              <FotoCandidato
                id={c.candidatoId}
                nome={c.nome}
                urlFoto={c.urlFoto}
                nulo={nulo}
                className="size-9 text-base"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {c.nome}
                  {c.candidatoId === destacarId && <span className="ml-2 text-xs text-primary">seu voto</span>}
                </p>
                <p className="text-xs text-muted">
                  {c.partido ? `${c.partido.nome} · ${c.partido.digito}` : "Voto nulo"}
                </p>
              </div>
              <p className="ml-auto text-right">
                <span className="text-2xl font-semibold tabular-nums">{c.votos}</span>
                <span className="text-xs text-muted block">{c.votos === 1 ? "voto" : "votos"} · {pct.toFixed(0)}%</span>
              </p>
            </div>
            <div className="h-3 rounded-full bg-background overflow-hidden">
              <div className={`h-full rounded-full ${cor.fundo} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted text-right">{total} {total === 1 ? "voto" : "votos"} no total</p>
    </div>
  );
}

export { BotaoConfirmaUrna } from "./BotaoConfirmaUrna";

