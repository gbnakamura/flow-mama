import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { sendFlowMamaTestConfirmation, sendPersonalTrainingTestConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

async function sendPersonalTrainingPreview(formData: FormData) {
  "use server";

  await requireAdmin();
  const parsed = previewSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/admin/email-previews?error=email");

  try {
    await sendPersonalTrainingTestConfirmation(parsed.data.email);
  } catch (error) {
    console.error("Unable to send Personal Training email preview", error);
    redirect("/admin/email-previews?error=send");
  }

  redirect(`/admin/email-previews?sent=${encodeURIComponent(parsed.data.email)}`);
}

async function sendFlowMamaPreview(formData: FormData) {
  "use server";

  await requireAdmin();
  const parsed = previewSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/admin/email-previews?error=email");

  try {
    await sendFlowMamaTestConfirmation(parsed.data.email);
  } catch (error) {
    console.error("Unable to send Flow Mama email preview", error);
    redirect("/admin/email-previews?error=send");
  }

  redirect(`/admin/email-previews?sent=${encodeURIComponent(parsed.data.email)}&template=Flow+Mama`);
}

type EmailPreviewsPageProps = {
  searchParams: Promise<{ sent?: string; error?: string; template?: string }>;
};

export default async function EmailPreviewsPage({ searchParams }: EmailPreviewsPageProps) {
  await requireAdmin();
  const params = await searchParams;

  return (
    <main className="admin-shell">
      <AdminHeader title="Email previews" eyebrow="Communications" active="emails" />
      {params.sent && <p className="admin-success">{params.template ?? "Personal Training"} preview sent to {params.sent}.</p>}
      {params.error && <p className="form-error">{params.error === "email" ? "Enter a valid recipient email address." : "The preview could not be sent. Please try again."}</p>}

      <section className="admin-panel admin-email-preview-panel">
        <div className="admin-panel-heading">
          <p className="booking-eyebrow">Flow Mama</p>
          <h2>Booking confirmation</h2>
          <p>Send the branded confirmation with safe sample Early Flow sessions, venue guidance, preparation notes, and the health-screening link.</p>
        </div>
        <form action={sendFlowMamaPreview} className="admin-email-preview-form">
          <label>Send preview to<input required type="email" name="email" defaultValue="guy.nakamura@gmail.com" placeholder="name@example.com" /></label>
          <button className="pay-button" type="submit">Send test email</button>
        </form>
      </section>

      <section className="admin-panel admin-email-preview-panel">
        <div className="admin-panel-heading">
          <p className="booking-eyebrow">Personal training</p>
          <h2>Booking confirmation</h2>
          <p>Send the branded confirmation with safe sample Group and 1:1 sessions. The subject and confirmation badge clearly identify it as a test.</p>
        </div>
        <form action={sendPersonalTrainingPreview} className="admin-email-preview-form">
          <label>Send preview to<input required type="email" name="email" defaultValue="guy.nakamura@gmail.com" placeholder="name@example.com" /></label>
          <button className="pay-button" type="submit">Send test email</button>
        </form>
      </section>
    </main>
  );
}
