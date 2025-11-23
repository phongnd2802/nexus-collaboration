"use client";

import React, { useRef, useEffect, Suspense } from "react";
import { useInView } from "framer-motion";
import { useSearchParams } from "next/navigation";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Hero from "@/components/home/hero";
import Features from "@/components/home/features";
import { Loader2 } from "lucide-react";

function SearchParamsHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash =
      searchParams.get("section") || window.location.hash.replace("#", "");
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [searchParams]);

  return null;
}

function SearchParamsLoading() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-violet-700" />
    </div>
  );
}

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <Suspense fallback={<SearchParamsLoading />}>
        <SearchParamsHandler />
      </Suspense>

      <main className="grow">
        {/* Hero Section */}
        <div id="hero">
          <Hero ref={heroRef} heroInView={heroInView} />
        </div>

        {/* Features Section */}
        <div id="features">
          <Features ref={featuresRef} featuresInView={featuresInView} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return <Home />;
}
