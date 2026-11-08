"use client";

import type { ReactNode } from "react";
import { ROTULO_FILA, type TipoFila, type UsuarioNaFila } from "@/lib/fila/tipos";
import { Cartao, Senha } from "./ui";

export function ListaFila({
  tipo,
  usuarios,
  destacarId,
  acao,
}: {
  tipo: TipoFila;
  usuarios: UsuarioNaFila[];
  destacarId?: number;
  acao?: (u: UsuarioNaFila) => ReactNode;
}) {
  const cor = tipo === "PREFERENCIAL" ? "bg-preferencial" : "bg-comum";

  return (
    <Cartao className="flex flex-col min-h-0">
      <header className="flex items-center gap-2 mb-3">
        <span className={`size-2.5 rounded-full ${cor}`} />
        <h2 className="font-semibold">Fila {ROTULO_FILA[tipo].toLowerCase()}</h2>
        <span className="ml-auto text-sm text-muted tabular-nums">
          {usuarios.length} {usuarios.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </header>

      {usuarios.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">Ninguém aguardando</p>
      ) : (
        <ol className="divide-y divide-border">
          {usuarios.map((u) => (
            <li
              key={u.id}
              className={`flex items-center gap-3 py-2.5 ${u.id === destacarId ? "bg-primary/10 -mx-2 px-2 rounded-md" : ""}`}
            >
              <span className="w-6 text-xs text-muted tabular-nums" title="Posição na fila">
                {u.posicaoNaFila}º
              </span>
              <Senha usuario={u} />
              <span className="truncate">{u.nome}</span>
              {u.id === destacarId && <span className="text-xs text-primary font-medium">você</span>}
              {u.mock && u.id !== destacarId && (
                <span className="text-[10px] uppercase tracking-wide text-muted border border-border rounded px-1">
                  demo
                </span>
              )}
              {acao && <span className="ml-auto shrink-0">{acao(u)}</span>}
            </li>
          ))}
        </ol>
      )}
    </Cartao>
  );
}
