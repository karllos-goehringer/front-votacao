import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cabecalho } from "@/components/Cabecalho";
import { AdminProvider } from "@/lib/admin/AdminProvider";
import { FilaProvider } from "@/lib/fila/FilaProvider";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fila da Cabine de Votação",
  description: "Fila da cabine de votação em tempo real: senha, voto no candidato A ou B e resultados",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme é definido pelo script antes da hidratação, por isso o suppressHydrationWarning.
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica o tema salvo antes da primeira pintura (sem piscar). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <FilaProvider>
          <AdminProvider>
            <Cabecalho />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-6 sm:pt-10 pb-28 sm:pb-10">{children}</main>
          </AdminProvider>
        </FilaProvider>
      </body>
    </html>
  );
}
