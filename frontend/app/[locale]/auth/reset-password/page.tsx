import { ResetPassword } from "@/components/auth/reset-password";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AuthPage.resetPassword",
  });

  return {
    title: `${t("title")} | Nexus`,
    description: t("subtitle"),
  };
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <ResetPassword />
      </div>
    </div>
  );
}
