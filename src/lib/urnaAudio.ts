/**
 * Utilitário de reprodução do som característico de confirmação da urna eletrônica brasileira ("pilili").
 *
 * Prioridades:
 * 1. Toca arquivos estáticos colocados pelo usuário em /audio/ (suporta .mp3 e .wav).
 * 2. Em caso de ausência ou bloqueio, executa fallback automático para síntese via Web Audio API.
 */

export async function tocarSomUrna(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Tenta reproduzir arquivo de áudio estático (prioriza .mp3 se o usuário fornecer, seguido do .wav nativo)
  const fontes = [
    "/audio/urna-confirma.mp3",
    "/audio/urna-confirma.wav",
    "/audio/urna-beep.wav",
  ];

  for (const src of fontes) {
    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      const promessa = audio.play();
      if (promessa !== undefined) {
        await promessa;
        return; // Áudio reproduzido com sucesso
      }
    } catch {
      // Segue para a próxima fonte caso o arquivo não exista ou o formato falhe
    }
  }

  // 2. Síntese via Web Audio API (emula a modulação de frequência clássica da urna caso nenhum arquivo responda)
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const t0 = ctx.currentTime;
    const duracaoTotal = 0.92;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";

    // Frequências alternadas características que compõem o som ("pilili")
    const f1 = 1760; // Lá 6 (1760 Hz)
    const f2 = 2349; // Ré 7 (2349 Hz)
    const ciclo = 0.045; // Alternância em torno de 22 Hz

    for (let t = 0; t < duracaoTotal; t += ciclo) {
      const freq = Math.floor(t / ciclo) % 2 === 0 ? f1 : f2;
      osc.frequency.setValueAtTime(freq, t0 + t);
    }

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.4, t0 + 0.02);
    gain.gain.setValueAtTime(0.4, t0 + duracaoTotal - 0.05);
    gain.gain.linearRampToValueAtTime(0.001, t0 + duracaoTotal);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duracaoTotal);
  } catch {
    // Silencia qualquer exceção em ambientes restritivos
  }
}
