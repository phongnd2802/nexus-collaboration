import { ForgotPasswordForm } from "@/components/auth/forgot-passsword";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AuthPage.forgotPassword",
  });

  return {
    title: `${t("title")} | Nexus`,
    description: t("description"),
  };
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
