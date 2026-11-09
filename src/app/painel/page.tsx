"use client";

import { SoNoNavegador } from "@/components/SoNoNavegador";
import { ListaFila } from "@/components/ListaFila";
import { Cartao, EtiquetaFila, Senha } from "@/components/ui";
import { useFila } from "@/lib/fila/FilaProvider";

export default function PainelPage() {
  return (
    <SoNoNavegador>
      <Painel />
    </SoNoNavegador>
  );
}

function Painel() {
  const { estado } = useFila();
  if (!estado) return <p className="text-muted text-center py-20">Aguardando dados do servidor…</p>;

  const proximo = [...estado.preferencial, ...estado.comum].sort((a, b) => a.aFrente - b.aFrente)[0] ?? null;
  const anteriores = estado.ultimosChamados.filter((u) => u.id !== estado.naCabine?.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2 text-center py-10">
          <p className="text-sm uppercase tracking-widest text-muted">Na cabine</p>
          {estado.naCabine ? (
            <>
              <Senha usuario={estado.naCabine} className="block text-7xl sm:text-8xl my-3" />
              <p className="text-2xl font-medium truncate">{estado.naCabine.nome}</p>
              <div className="mt-3">
                <EtiquetaFila tipo={estado.naCabine.tipoFila} />
              </div>
            </>
          ) : (
            <p className="text-3xl font-semibold text-success my-10">Cabine livre</p>
          )}
        </Cartao>

        <div className="grid gap-4">
          <Cartao>
            <p className="text-sm text-muted">Próximo</p>
            {proximo ? (
              <p className="mt-1 flex items-baseline gap-3">
                <Senha usuario={proximo} className="text-3xl" />
                <span className="truncate">{proximo.nome}</span>
              </p>
            ) : (
              <p className="mt-1 text-muted">Ninguém aguardando</p>
            )}
          </Cartao>
          <Cartao>
            <p className="text-sm text-muted mb-2">Chamados anteriormente</p>
            {anteriores.length === 0 ? (
              <p className="text-muted text-sm">—</p>
            ) : (
              <ul className="space-y-1">
                {anteriores.map((u) => (
                  <li key={u.id} className="flex gap-3">
                    <Senha usuario={u} />
                    <span className="truncate text-muted">{u.nome}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ListaFila tipo="PREFERENCIAL" usuarios={estado.preferencial} />
        <ListaFila tipo="COMUM" usuarios={estado.comum} />
      </div>
    </div>
  );
}
