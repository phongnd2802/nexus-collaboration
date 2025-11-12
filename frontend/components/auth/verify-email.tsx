"use client";

import { Suspense } from "react";
import { LoadingForm } from "./loading-form";
import { VerifyEmailForm } from "./verify-email-form";


export const VerifyEmail = () => {
  return (
    <Suspense fallback={<LoadingForm />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
