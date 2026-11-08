"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { Aviso, Botao, Cartao, mensagemDeErro } from "@/components/ui";
import { useAdmin } from "@/lib/admin/AdminProvider";

export default function AdminLoginPage() {
  return (
    <SoNoNavegador>
      <LoginComChave />
    </SoNoNavegador>
  );
}

/**
 * Com cacheComponents o Next guarda esta tela com o estado de quando saímos dela
 * (ex.: "Entrando…" logo depois do login). A chave muda com a sessão, então depois
 * de "Sair" o formulário é recriado limpo.
 */
function LoginComChave() {
  const { sessao } = useAdmin();
  return <Login key={sessao?.token ?? "deslogado"} />;
}

function Login() {
  const { sessao, login } = useAdmin();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Já logado (ex.: F5 nesta tela) → vai direto ao painel.
  useEffect(() => {
    if (sessao) router.replace("/admin");
  }, [sessao, router]);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(nome, senha);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary";

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Administrador</h1>
      <p className="text-muted mb-6">Entre com nome e senha.</p>
      <Cartao>
        <form onSubmit={enviar} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="username" className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className={campo}
            />
          </label>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao type="submit" disabled={enviando} className="w-full">
            {enviando ? "Entrando…" : "Entrar"}
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
