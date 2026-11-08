import { redirect } from "next/navigation";

// A tela de resultado virou a página pública de resultados parciais.
export default function ResultadoPage() {
  redirect("/resultados");
}
