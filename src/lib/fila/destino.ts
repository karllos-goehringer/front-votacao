"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFila } from "./FilaProvider";

/**
 * Para onde o eleitor deste navegador deve ir, conforme a sessão salva:
 * já votou → resultados parciais; está na cabine → votar; está na fila → entrar (tela de espera).
 */
export function useDestinoEleitor(): "/resultados" | "/votar" | "/entrar" | null {
  const { meuTicket, comprovante, situacao } = useFila();
  if (comprovante) return "/resultados";
  if (!meuTicket) return null;
  if (situacao?.tipo === "na-cabine") return "/votar";
  return "/entrar";
}

/** Redireciona para o destino do eleitor quando ele não é a página atual. */
export function useIrParaDestino(atual: string, aceitos: Array<string | null> = [atual]): void {
  const destino = useDestinoEleitor();
  const router = useRouter();
  useEffect(() => {
    if (!aceitos.includes(destino)) router.replace(destino ?? "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino, atual, router]);
}
