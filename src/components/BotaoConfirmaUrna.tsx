"use client";

import React from "react";

interface BotaoConfirmaUrnaProps {
  disabled?: boolean;
  carregando?: boolean;
  onClick?: () => void | Promise<void>;
  className?: string;
}

/**
 * Tecla "CONFIRMA" inspirada no teclado físico da urna eletrônica do TSE.
 *
 * Características de design:
 * - Formato retangular clássico de keycap com cantos levemente suavizados (raio de 6px).
 * - Tom de verde oficial da urna eletrônica (#008742).
 * - Chanfros de plástico moldado (topo com reflexo e bordas laterais mecânicas).
 * - Extrusão 3D física com efeito de afundamento real ao pressionar.
 * - Moldura escura tipo carcaça do terminal do eleitor.
 * - Tipografia oficial: apenas a palavra "CONFIRMA" em caixa alta, negrito e branco.
 */
export function BotaoConfirmaUrna({
  disabled = false,
  carregando = false,
  onClick,
  className = "",
}: BotaoConfirmaUrnaProps) {
  const desativado = disabled || carregando;

  return (
    <div
      className={`inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-[#1c1d21] dark:bg-[#121316] border border-[#2e3138] dark:border-stone-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] w-full sm:w-auto ${className}`}
    >
      <button
        type="button"
        onClick={desativado ? undefined : onClick}
        disabled={desativado}
        aria-label="Confirmar voto na urna eletrônica"
        className={`relative select-none font-sans font-black tracking-[0.18em] uppercase transition-all duration-75 flex items-center justify-center rounded-[6px] ${
          // Dimensões proporcionais à tecla da urna
          "w-full sm:w-[210px] md:w-[230px] h-14 sm:h-[68px] px-6 text-xl sm:text-2xl"
        } ${
          desativado
            ? carregando
              ? // Tecla afundada durante a gravação
                "bg-[#007036] text-white border-t-2 border-[#16a352] border-x-2 border-[#005a2b] shadow-[0_2px_0_#00381a] translate-y-[5px] sm:translate-y-[6px] cursor-wait"
              : // Tecla inativa aguardando a seleção do candidato
                "bg-[#1b3323] dark:bg-[#14261a] text-emerald-100/30 border-t-2 border-[#274a33] border-x-2 border-[#15291c] shadow-[0_4px_0_#0c1911] cursor-not-allowed opacity-75"
            : [
                // Tecla verde da urna eletrônica
                "bg-[#008742] hover:bg-[#009448]",
                "text-white",
                // Chanfros mecânicos da tecla
                "border-t-2 border-[#18b85d]",
                "border-x-2 border-[#006e34]",
                // Extrusão física em 3D
                "shadow-[0_6px_0_#00441e,0_10px_12px_rgba(0,0,0,0.45)] sm:shadow-[0_8px_0_#00441e,0_12px_14px_rgba(0,0,0,0.45)]",
                // Afundamento tátil ao clicar
                "active:translate-y-[5px] sm:active:translate-y-[6px]",
                "active:shadow-[0_1px_0_#00441e,0_3px_5px_rgba(0,0,0,0.3)]",
                "cursor-pointer",
              ].join(" ")
        }`}
      >
        {carregando ? (
          <span className="flex items-center justify-center gap-2.5 text-white">
            <svg
              className="animate-spin size-5 text-white shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-base sm:text-lg tracking-widest">GRAVANDO…</span>
          </span>
        ) : (
          <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]">
            CONFIRMA
          </span>
        )}
      </button>
    </div>
  );
}
