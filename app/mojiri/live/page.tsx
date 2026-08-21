import { redirect } from "next/navigation";

export default function MojiriLivePage() {
  redirect("/mojiri?month=2026-08");
}
