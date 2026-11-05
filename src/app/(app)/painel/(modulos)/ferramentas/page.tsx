import { requireParoquia } from "@/server/auth/session";
import { QrForm } from "./qr-form";

export default async function Page() {
  await requireParoquia("ferramentas:usar");
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Ferramentas de QR Code</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Gere um cartaz pronto para imprimir com o QR Code de um link, WhatsApp, Wi-Fi ou Pix.
      </p>
      <QrForm />
    </main>
  );
}
