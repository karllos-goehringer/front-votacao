"use client";

import { useEffect, useState } from "react";
import { aplicarTema, CHAVE_TEMA, lerTema, type Tema } from "@/lib/tema";

/** Alterna entre modo claro e escuro. A escolha fica salva no navegador. */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>(() => lerTema());

  // Outra aba trocou o tema → acompanha.
  useEffect(() => {
    const aoMudar = (ev: StorageEvent) => {
      if (ev.key !== CHAVE_TEMA) return;
      const novo: Tema = ev.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = novo;
      setTema(novo);
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const escuro = tema === "dark";
  const rotulo = escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro";

  return (
    <button
      type="button"
      onClick={() => {
        const novo: Tema = escuro ? "light" : "dark";
        aplicarTema(novo);
        setTema(novo);
      }}
      aria-label={rotulo}
      title={rotulo}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-background transition"
    >
      {escuro ? <IconeSol /> : <IconeLua />}
      <span className="hidden sm:inline">{escuro ? "Claro" : "Escuro"}</span>
    </button>
  );
}

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
