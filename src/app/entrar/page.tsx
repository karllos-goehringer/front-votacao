"use client";

import { useState, type FormEvent } from "react";
import { SoNoNavegador } from "@/components/SoNoNavegador";
import { ListaFila } from "@/components/ListaFila";
import { Aviso, Botao, Cartao, EtiquetaFila, Senha, mensagemDeErro } from "@/components/ui";
import { useFila } from "@/lib/fila/FilaProvider";
import { useIrParaDestino } from "@/lib/fila/destino";
import type { TipoFila } from "@/lib/fila/tipos";

export default function EntrarPage() {
  return (
    <SoNoNavegador>
      <Conteudo />
    </SoNoNavegador>
  );
}

function Conteudo() {
  const { meuTicket, jaVotou, comprovante, dispositivoVerificado } = useFila();
  // Chegou a vez (o servidor avisou pelo WebSocket) → vai para a tela de voto.
  // Se já votou, o destino é /resultados.
  useIrParaDestino("/entrar", ["/entrar", null]);

  const temVotoLocal = Boolean(comprovante) || jaVotou;
  if (temVotoLocal && !dispositivoVerificado) {
    return <p className="text-muted text-center py-20">Verificando situação do eleitor…</p>;
  }

  if (temVotoLocal && dispositivoVerificado) {
    return <p className="text-muted text-center py-20">Você já votou nesta eleição. Redirecionando para os resultados…</p>;
  }

  return meuTicket ? <MinhaSenha /> : <FormularioSenha />;
}

function FormularioSenha() {
  const { entrar, status } = useFila();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoFila>("COMUM");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(nome, tipo);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Retirar senha</h1>
      <p className="text-muted mb-6">Informe seu nome e escolha a fila.</p>

      <Cartao>
        <form onSubmit={enviar} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              maxLength={150}
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
              placeholder="Seu nome completo"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium mb-1.5">Fila</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["COMUM", "Comum", "Atendimento por ordem de chegada"],
                  ["PREFERENCIAL", "Preferencial", "Idosos, gestantes, pessoas com deficiência ou com criança de colo"],
                ] as const
              ).map(([valor, rotulo, dica]) => (
                <label
                  key={valor}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                    tipo === valor ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={valor}
                    checked={tipo === valor}
                    onChange={() => setTipo(valor)}
                    className="sr-only"
                  />
                  <span className="font-medium block">{rotulo}</span>
                  <span className="text-muted text-xs">{dica}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {erro && <Aviso>{erro}</Aviso>}

          <Botao type="submit" disabled={enviando || status !== "conectado"} className="w-full">
            {enviando ? "Gerando senha…" : status === "conectado" ? "Entrar na fila" : "Aguardando conexão…"}
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}

function MinhaSenha() {
  const { meuTicket, situacao, estado, sairDaFila, concluir } = useFila();
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!meuTicket) return null;

  async function sair() {
    if (!confirm("Sair da fila? Sua senha será cancelada.")) return;
    setErro(null);
    setSaindo(true);
    try {
      await sairDaFila();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSaindo(false);
    }
  }

  const naCabine = situacao?.tipo === "na-cabine";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] items-start">
      <Cartao className={`text-center ${naCabine ? "border-success ring-2 ring-success" : ""}`}>
        <p className="text-sm text-muted">Sua senha</p>
        <Senha usuario={meuTicket} className="block text-6xl my-2" />
        <p className="font-medium truncate">{meuTicket.nome}</p>
        <div className="mt-2">
          <EtiquetaFila tipo={meuTicket.tipoFila} />
        </div>

        <div className="mt-6" aria-live="polite">
          {situacao?.tipo === "aguardando" && (
            <>
              <p className="text-4xl font-semibold tabular-nums">{situacao.aFrente}</p>
              <p className="text-muted">
                {situacao.aFrente === 1 ? "pessoa na sua frente" : "pessoas na sua frente"}
              </p>
              <p className="text-sm text-muted mt-1">
                {situacao.posicao}º na fila {meuTicket.tipoFila === "PREFERENCIAL" ? "preferencial" : "comum"}
              </p>
              <p className="text-sm mt-3">
                {situacao.aFrente === 0
                  ? "Você é o próximo! Aguarde a liberação da cabine."
                  : situacao.aFrente === 1 && estado?.naCabine
                    ? "Você é o próximo! Sua cabine abrirá assim que o eleitor atual concluir o voto."
                    : "Aguarde a sua vez na fila."}
              </p>
              {estado?.naCabine && (
                <p className="text-xs text-muted mt-3">
                  Votando agora: <Senha usuario={estado.naCabine} /> {estado.naCabine.nome}
                </p>
              )}
            </>
          )}
          {naCabine && (
            <p className="rounded-lg bg-success-soft text-success px-4 py-3 text-lg font-semibold">
              É a sua vez! Abrindo a cabine…
            </p>
          )}
          {situacao?.tipo === "fora" && (
            <Aviso tipo="info">Esta senha não está mais na fila (foi removida pelo administrador).</Aviso>
          )}
          {situacao?.tipo === "desconhecida" && <Aviso tipo="info">Atualizando sua posição…</Aviso>}
        </div>

        {erro && (
          <div className="mt-4">
            <Aviso>{erro}</Aviso>
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-center">
          {situacao?.tipo === "aguardando" && (
            <Botao variante="perigo" onClick={sair} disabled={saindo}>
              {saindo ? "Saindo…" : "Sair da fila"}
            </Botao>
          )}
          {situacao?.tipo === "fora" && (
            <Botao variante="secundario" onClick={concluir}>
              Retirar nova senha
            </Botao>
          )}
        </div>
      </Cartao>

      {estado && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListaFila
            tipo="PREFERENCIAL"
            usuarios={estado.preferencial}
            destacarId={meuTicket.tipoFila === "PREFERENCIAL" ? meuTicket.id : undefined}
          />
          <ListaFila
            tipo="COMUM"
            usuarios={estado.comum}
            destacarId={meuTicket.tipoFila === "COMUM" ? meuTicket.id : undefined}
          />
        </div>
      )}
    </div>
  );
}
