# 🗳️ Cabine de Votação — Front

Interface web da **fila da cabine de votação em tempo real**: o eleitor retira a senha, acompanha a fila, vota quando é chamado e vê os resultados parciais atualizando ao vivo.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

##  O que dá pra fazer

| Tela | Rota | Pra quê |
| --- | --- | --- |
|  Início | `/` | Ponto de partida: entrar na fila ou ir para o painel do admin |
|  Retirar senha | `/entrar` | Informa o nome, escolhe **fila comum** ou **preferencial** e recebe a senha |
|  Cabine | `/votar` | Quando chega a sua vez, escolhe o candidato (ou anula) |
|  Resultados | `/resultados` | Votos por candidato, ao vivo, com o comprovante do seu voto |
|  Painel | `/painel` | Telão com a senha na cabine, o próximo e os últimos chamados |
|  Admin | `/admin` | Testa os métodos da fila, roda o modo *mock*, vê o relatório e a contagem de votos |

> `/resultado` e `/mesario` são rotas antigas e redirecionam para `/resultados` e `/admin`.

---

##  Rodando

> Pré-requisito: o **back** precisa estar rodando (por padrão na porta `3001`).

```bash
npm install
npm run dev
```

Abra **http://localhost:3000**.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |

---

##  Variáveis de ambiente

Copie `.env.example` para `.env.local` **só se precisar** — sem elas, o front se conecta sozinho ao back no mesmo host da página, porta `3001`.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://<host>:3001` | URL da API REST |
| `NEXT_PUBLIC_WS_URL` | `ws://<host>:3001/ws` | URL do WebSocket |

>  Evite fixar `localhost` nessas variáveis se for testar pelo celular: no telefone, `localhost` é o próprio telefone.

---

##  Testando pelo celular

1. Celular e PC na **mesma rede Wi‑Fi**.
2. Descubra o IP do PC (`ipconfig` → *Endereço IPv4*, ex.: `192.168.0.144`).
3. No celular, abra `http://<IP-do-PC>:3000`.

O `next.config.ts` já libera IPs de rede local em `allowedDevOrigins` — sem isso o Next 16 bloqueia o JavaScript da página e o app "não acha o back". Se não funcionar, teste `http://<IP-do-PC>:3001/resultados` no celular: se não abrir, o problema é rede/firewall, não o código.

---

##  Estrutura

```
src/
├── app/                    # Rotas (App Router)
│   ├── page.tsx            # Início
│   ├── entrar/             # Retirar senha
│   ├── votar/              # Cabine de votação
│   ├── resultados/         # Resultados parciais
│   ├── painel/             # Telão da fila
│   └── admin/              # Painel do administrador (+ login)
├── components/             # UI compartilhada (Cabecalho, ListaFila, BarrasResultado…)
└── lib/
    ├── api.ts              # fetch da API REST com medição de tempo
    ├── tema.ts             # Tema claro/escuro
    ├── admin/              # Sessão do administrador
    └── fila/
        ├── FilaProvider.tsx  # Estado global: fila, ticket, voto e resultado
        ├── FilaSocket.ts     # Cliente WebSocket com reconexão
        ├── sessao.ts         # Persistência no localStorage
        ├── destino.ts        # Para onde mandar o eleitor (entrar / votar / resultados)
        └── tipos.ts          # Tipos compartilhados com o back
```

---

##  Como o tempo real funciona

```
 back ──WebSocket──▶ FilaSocket ──▶ FilaProvider ──▶ telas
  │   fila:estado      (reconecta)     │
  │   fila:proximo                     ├─ estado da fila → painel, cabine, admin
  │   voto:novo ───────────────────────┴─ refaz GET /resultados → barras de votos
  └──REST (api.ts)── entrar, votar, relatórios, ações do admin
```

- **Ticket, comprovante e sessão do admin** ficam no `localStorage` — sobrevivem ao F5 e sincronizam entre abas.
- Cada voto novo dispara um `voto:novo`, e todas as telas abertas atualizam a contagem sozinhas.
