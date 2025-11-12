"use client";

import type React from "react";

import { Suspense } from "react";
import { LoadingForm } from "./loading-form";
import { SignUpForm } from "./sign-up-form";


export const SignUp = () => {
  return (
    <Suspense fallback={<LoadingForm />}>
      <SignUpForm />
    </Suspense>
  );
}
