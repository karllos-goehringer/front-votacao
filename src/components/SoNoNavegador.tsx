"use client";

import { Suspense, use, useSyncExternalStore, type ReactNode } from "react";
import { browser } from "react-dom";

const subVazio = () => () => {};

/** Retorna true apenas após a hidratação no navegador, evitando mismatch de SSR. */
export function useMontado(): boolean {
  return useSyncExternalStore(
    subVazio,
    () => true,
    () => false,
  );
}

function Portao({ children }: { children: ReactNode }) {
  use(browser("Depende da sessão salva no localStorage"));
  return children;
}

/**
 * Renderiza o conteúdo só no navegador. No servidor (e no HTML estático) sai o
 * fallback. Usado em tudo que lê a fila salva localmente, para o primeiro render
 * já sair com os dados do localStorage, sem erro de hidratação.
 */
export function SoNoNavegador({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <Carregando />}>
      <Portao>{children}</Portao>
    </Suspense>
  );
}

export function Carregando() {
  return (
    <p className="text-muted text-center py-20" role="status">
      Carregando a fila…
    </p>
  );
}
