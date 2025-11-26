import { SignIn } from "@/components/auth/sign-in";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Nexus Collaboration",
  description: "Sign in to your Nexus Collaboration account",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="mt-10">
          <SignIn />
        </div>
      </div>
    </div>
  );
}
