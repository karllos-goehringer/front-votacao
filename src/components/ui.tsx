import type { ReactNode } from "react";
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

export function corCandidato(id: number) {
  return CORES_CANDIDATO[(id - 1) % CORES_CANDIDATO.length] ?? CORES_CANDIDATO[0];
}

/** Sem foto cadastrada: mostra a letra do candidato num círculo. */
export function FotoCandidato({ id, nome, urlFoto, className = "size-20 text-4xl" }: { id: number; nome: string; urlFoto?: string | null; className?: string }) {
  const cor = corCandidato(id);
  if (urlFoto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={urlFoto} alt={nome} className={`rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden className={`inline-flex items-center justify-center rounded-full font-bold ${cor.suave} ${cor.texto} ${className}`}>
      {letraCandidato(nome)}
    </span>
  );
}

/** Quantidade absoluta de votos de cada candidato, com barra proporcional. */
export function BarrasResultado({
  resultado,
  destacarId,
}: {
  resultado: { candidatoId: number; nome: string; partido: { nome: string; digito: string } | null; votos: number }[];
  destacarId?: number;
}) {
  const total = resultado.reduce((s, c) => s + c.votos, 0);
  return (
    <div className="space-y-4">
      {resultado.map((c) => {
        const cor = corCandidato(c.candidatoId);
        const pct = total ? (c.votos / total) * 100 : 0;
        return (
          <div key={c.candidatoId}>
            <div className="flex items-center gap-3 mb-1.5">
              <FotoCandidato id={c.candidatoId} nome={c.nome} className="size-9 text-base" />
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
