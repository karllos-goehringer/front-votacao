"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotaoTema } from "@/components/BotaoTema";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { useAdmin } from "@/lib/admin/AdminProvider";
import { useFila } from "@/lib/fila/FilaProvider";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/resultados", rotulo: "Resultados" },
  { href: "/painel", rotulo: "Painel" },
] as const;

export function Cabecalho() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
          Cabine de Votação
        </Link>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                pathname === l.href ? "bg-background font-medium" : "text-muted hover:text-foreground"
              }`}
            >
              {l.rotulo}
            </Link>
          ))}
          <SoNoNavegador fallback={null}>
            <LinkAdmin ativo={pathname.startsWith("/admin")} />
          </SoNoNavegador>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <StatusConexao />
          {/* O tema salvo só existe no navegador; no servidor sai um espaço do mesmo tamanho. */}
          <SoNoNavegador fallback={<span className="inline-block w-9 sm:w-20 h-7" />}>
            <BotaoTema />
          </SoNoNavegador>
        </div>
      </div>
    </header>
  );
}

function LinkAdmin({ ativo }: { ativo: boolean }) {
  const { sessao } = useAdmin();
  if (!sessao) return null;
  return (
    <Link
      href="/admin"
      className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
        ativo ? "bg-background font-medium" : "text-muted hover:text-foreground"
      }`}
    >
      Administração
    </Link>
  );
}

function StatusConexao() {
  const { status, sincronizado } = useFila();
  const online = status === "conectado" && sincronizado;
  const texto = online ? "Ao vivo" : status === "desconectado" ? "Offline" : "Conectando…";

  return (
    <span
      className="flex items-center gap-2 text-xs text-muted whitespace-nowrap"
      title={online ? "Conectado ao servidor" : "Mostrando os últimos dados salvos neste navegador"}
      aria-live="polite"
    >
      <span
        className={`size-2 rounded-full ${
          online ? "bg-success" : status === "desconectado" ? "bg-danger" : "bg-preferencial animate-pulse"
        }`}
      />
      {texto}
    </span>
  );
}
