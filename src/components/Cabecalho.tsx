"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotaoTema } from "@/components/BotaoTema";
import { SoNoNavegador, useMontado } from "@/components/SoNoNavegador";
import { useAdmin } from "@/lib/admin/AdminProvider";
import { useFila } from "@/lib/fila/FilaProvider";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/resultados", rotulo: "Resultados" },
  { href: "/painel", rotulo: "Painel" },
] as const;

export function Cabecalho() {
  const pathname = usePathname();
  const { jaVotou, comprovante, dispositivoVerificado } = useFila();
  const montado = useMontado();

  const jaVotouEfetivo = montado && (Boolean(comprovante) || jaVotou) && dispositivoVerificado;
  const links = jaVotouEfetivo ? LINKS.filter((l) => l.href !== "/") : LINKS;

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
          <Link
            href={jaVotouEfetivo ? "/resultados" : "/"}
            className="font-semibold tracking-tight whitespace-nowrap text-base sm:text-lg"
          >
            Cabine de Votação
          </Link>
          <nav className="hidden sm:flex gap-1 overflow-x-auto text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
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
          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            <StatusConexao />
            {/* O tema salvo só existe no navegador; no servidor sai um espaço do mesmo tamanho. */}
            <SoNoNavegador fallback={<span className="inline-block w-9 sm:w-20 h-7" />}>
              <BotaoTema />
            </SoNoNavegador>
          </div>
        </div>
      </header>
      <NavBottom />
    </>
  );
}

function NavBottom() {
  const pathname = usePathname();
  const { jaVotou, comprovante, dispositivoVerificado } = useFila();
  const montado = useMontado();

  const jaVotouEfetivo = montado && (Boolean(comprovante) || jaVotou) && dispositivoVerificado;

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed left-1/2 -translate-x-1/2 z-50 sm:hidden flex items-center gap-1 p-1.5 rounded-full bg-card/80 dark:bg-card/75 backdrop-blur-xl border border-border/80 shadow-lg shadow-black/10 max-w-[calc(100vw-2rem)] transition-all"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {!jaVotouEfetivo && (
        <ItemNavBottom
          href="/"
          rotulo="Início"
          ativo={pathname === "/"}
          icone={
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
      )}
      <ItemNavBottom
        href="/resultados"
        rotulo="Resultados"
        ativo={pathname.startsWith("/resultados") || pathname === "/resultado"}
        icone={
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        }
      />
      <ItemNavBottom
        href="/painel"
        rotulo="Painel"
        ativo={pathname.startsWith("/painel")}
        icone={
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        }
      />
      <SoNoNavegador fallback={null}>
        <ItemAdminBottom ativo={pathname.startsWith("/admin")} />
      </SoNoNavegador>
    </nav>
  );
}

function ItemAdminBottom({ ativo }: { ativo: boolean }) {
  const { sessao } = useAdmin();
  if (!sessao) return null;
  return (
    <ItemNavBottom
      href="/admin"
      rotulo="Admin"
      ativo={ativo}
      icone={
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      }
    />
  );
}

function ItemNavBottom({
  href,
  rotulo,
  ativo,
  icone,
}: {
  href: string;
  rotulo: string;
  ativo: boolean;
  icone: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center min-w-16 py-1 px-3 rounded-full text-xs transition-all duration-150 active:scale-95 ${
        ativo
          ? "bg-primary/15 text-primary font-semibold"
          : "text-muted hover:text-foreground hover:bg-background/40"
      }`}
    >
      <span className="mb-0.5">{icone}</span>
      <span className="text-[10px] leading-tight tracking-tight">{rotulo}</span>
    </Link>
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
