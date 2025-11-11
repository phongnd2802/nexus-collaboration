import { VerifyEmail } from "@/components/auth/verify-email";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | Nexus Collaboration",
  description: "Verify your email address for your Nexus Collaboration account",
};

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <VerifyEmail />
      </div>
    </div>
  );
}
