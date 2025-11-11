import { ResetPassword } from "@/components/auth/reset-password";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Nexus Collaboration",
  description: "Set a new password for your Nexus Collaboration account",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <ResetPassword />
      </div>
    </div>
  );
}
