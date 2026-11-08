"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ErroApi, type RespostaApi } from "@/lib/api";
import { CHAVE_ADMIN, gravarSessaoAdmin, lerSessaoAdmin, type SessaoAdmin } from "@/lib/fila/sessao";

interface AdminContexto {
  sessao: SessaoAdmin | null;
  login(nome: string, senha: string): Promise<void>;
  logout(): void;
  /** Chama a API com o token do admin; se o token expirou, desloga. */
  chamar<T>(caminho: string, method?: string): Promise<RespostaApi<T>>;
}

const Contexto = createContext<AdminContexto | null>(null);

const noNavegador = typeof window !== "undefined";

/**
 * Sessão do administrador. O token fica no localStorage, então o F5 não desloga;
 * ao abrir a página ele é conferido no servidor (/auth/me).
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoAdmin | null>(() => (noNavegador ? lerSessaoAdmin() : null));

  const definir = useCallback((s: SessaoAdmin | null) => {
    setSessao(s);
    gravarSessaoAdmin(s);
  }, []);

  useEffect(() => {
    const salva = lerSessaoAdmin();
    if (salva) {
      api("/auth/me", { token: salva.token }).catch((err) => {
        if (err instanceof ErroApi && err.status === 401) definir(null);
      });
    }
    const aoMudarStorage = (ev: StorageEvent) => {
      if (ev.key === CHAVE_ADMIN) setSessao(lerSessaoAdmin());
    };
    window.addEventListener("storage", aoMudarStorage);
    return () => window.removeEventListener("storage", aoMudarStorage);
  }, [definir]);

  const login = useCallback(
    async (nome: string, senha: string) => {
      const r = await api<SessaoAdmin>("/auth/login", { method: "POST", body: { nome, senha } });
      definir(r.data);
    },
    [definir],
  );

  const logout = useCallback(() => definir(null), [definir]);

  const chamar = useCallback(
    async <T,>(caminho: string, method = "GET") => {
      try {
        return await api<T>(caminho, { method, token: sessao?.token });
      } catch (err) {
        if (err instanceof ErroApi && err.status === 401) definir(null);
        throw err;
      }
    },
    [sessao, definir],
  );

  const valor = useMemo(() => ({ sessao, login, logout, chamar }), [sessao, login, logout, chamar]);
  return <Contexto value={valor}>{children}</Contexto>;
}

export function useAdmin(): AdminContexto {
  const ctx = use(Contexto);
  if (!ctx) throw new Error("useAdmin precisa estar dentro de <AdminProvider>");
  return ctx;
}
