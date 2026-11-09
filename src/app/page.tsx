"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SoNoNavegador, useMontado } from "@/components/SoNoNavegador";
import { useAdmin } from "@/lib/admin/AdminProvider";
import { useFila } from "@/lib/fila/FilaProvider";
import { useIrParaDestino } from "@/lib/fila/destino";

export default function Home() {
  const { jaVotou } = useFila();
  const router = useRouter();
  const montado = useMontado();

  useEffect(() => {
    if (montado && jaVotou) {
      router.replace("/resultados");
    }
  }, [montado, jaVotou, router]);

  // Se já votou, não exibe a tela de início e redireciona para os resultados
  if (montado && jaVotou) {
    return <p className="text-muted text-center py-20">Redirecionando para os resultados…</p>;
  }
  return (
    <div className="max-w-xl mx-auto py-6 sm:py-12 space-y-8 text-center">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Cabine de votação</h1>
        <p className="text-muted mt-2">Entre na fila, aguarde a sua vez e vote no candidato A ou B.</p>
        <SoNoNavegador fallback={<p className="text-sm text-muted mt-3">&nbsp;</p>}>
          <Resumo />
        </SoNoNavegador>
      </div>

      <div className="grid gap-3">
        <Link
          href="/entrar"
          className="rounded-xl bg-primary text-primary-foreground px-6 py-5 text-lg font-semibold hover:opacity-90 transition"
        >
          Entrar na fila
        </Link>
        <SoNoNavegador
          fallback={
            <Link
              href="/admin/login"
              className="rounded-xl border border-border bg-card px-6 py-5 text-lg font-semibold hover:border-primary transition"
            >
              Entrar como administrador
            </Link>
          }
        >
          <BotaoAdmin />
        </SoNoNavegador>
        <Link
          href="/resultados"
          className="rounded-xl border border-border bg-card px-6 py-4 font-medium text-muted hover:text-foreground hover:border-primary transition"
        >
          Ver resultados parciais
        </Link>
      </div>
    </div>
  );
}

function BotaoAdmin() {
  const { sessao } = useAdmin();
  return (
    <Link
      href={sessao ? "/admin" : "/admin/login"}
      className="rounded-xl border border-border bg-card px-6 py-5 text-lg font-semibold hover:border-primary transition"
    >
      {sessao ? "Abrir painel do administrador" : "Entrar como administrador"}
    </Link>
  );
}

function Resumo() {
  const { estado } = useFila();
  // Quem já tem senha (ou já votou) e apertou F5 volta direto para a sua tela.
  useIrParaDestino("/", [null]);

  if (!estado) return <p className="text-sm text-muted mt-3">Conectando ao servidor…</p>;
  const aguardando = estado.preferencial.length + estado.comum.length;
  return (
    <p className="text-sm text-muted mt-3">
      {aguardando} {aguardando === 1 ? "pessoa aguardando" : "pessoas aguardando"} · cabine{" "}
      {estado.naCabine ? `ocupada por ${estado.naCabine.nome}` : "livre"}
    </p>
  );
}
