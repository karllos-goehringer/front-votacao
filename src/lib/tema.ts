export type Tema = "light" | "dark";

export const CHAVE_TEMA = "fila:tema:v1";

/** Roda no <head> antes da página aparecer: aplica o tema salvo (padrão: claro). */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;

export function lerTema(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    
  }
}
