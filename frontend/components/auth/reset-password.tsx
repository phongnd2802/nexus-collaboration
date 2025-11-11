"use client";

import { Suspense } from "react";
import { LoadingForm } from "./loading-form";
import { ResetPasswordForm } from "./reset-password-form";

export const ResetPassword = () => {
  return (
    <Suspense fallback={<LoadingForm />}>
      <ResetPasswordForm />
    </Suspense>
  );
};
