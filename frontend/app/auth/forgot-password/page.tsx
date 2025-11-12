import { ForgotPasswordForm } from "@/components/auth/forgot-passsword";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | ProjectCollab",
  description: "Reset your ProjectCollab account password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
