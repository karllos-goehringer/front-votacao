import { obterOuCriarDeviceToken } from "./fila/sessao";

/** URL da API REST do back: NEXT_PUBLIC_API_URL, ou o mesmo host da página na porta 3001. */
export function urlDaApi(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export class ErroApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface RespostaApi<T> {
  data: T;
  /** Tempo de espera da requisição, medido no navegador (ida e volta). */
  tempoMs: number;
  /** Quanto o servidor levou para processar (header X-Tempo-Processamento). */
  tempoServidorMs: number | null;
}

/** fetch para a API, com token opcional e medição do tempo de espera da requisição. */
export async function api<T>(
  caminho: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<RespostaApi<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const devToken = obterOuCriarDeviceToken();
  if (devToken) {
    headers["x-device-token"] = devToken;
    headers["x-device-id"] = devToken;
  }

  const inicio = performance.now();
  let res: Response;
  try {
    res = await fetch(`${urlDaApi()}${caminho}`, {
      method,
      headers,
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ErroApi("Sem conexão com o servidor. Tente de novo em instantes.", 0);
  }
  const data = await res.json().catch(() => null);
  const tempoMs = Math.round((performance.now() - inicio) * 10) / 10;

  if (!res.ok) {
    // Erros do back: { error: CODIGO, message } (AppError) ou { error: mensagem }.
    const msg =
      data && typeof data.message === "string"
        ? data.message
        : data && typeof data.error === "string"
          ? data.error
          : `Erro ${res.status}`;
    throw new ErroApi(msg, res.status);
  }
  const servidor = res.headers.get("X-Tempo-Processamento");
  return { data: data as T, tempoMs, tempoServidorMs: servidor ? Number(servidor) : null };
}
