import { redirect } from "next/navigation";

// A tela do mesário virou o painel do administrador.
export default function MesarioPage() {
  redirect("/admin");
}
