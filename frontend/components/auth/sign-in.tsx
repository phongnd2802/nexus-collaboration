"use client";

import { Suspense } from "react";
import { LoadingForm } from "./loading-form";
import { SignInForm } from "./sign-in-form";


export const SignIn = () => {
  return (
    <Suspense fallback={<LoadingForm />}>
      <SignInForm />
    </Suspense>
  );
}
