"use client";

import type React from "react";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    try {
      const response = await fetch("/api/user/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubscribed(true);
        setEmail("");
        setTimeout(() => {
          setSubscribed(false);
        }, 600);
      }
      setIsSubscribing(false);
    } catch (error) {
      console.error("Subscription error:", error);
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="container px-4 py-12 md:px-6 md:py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:grid-cols-6">
          <div className="flex flex-col gap-6 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <motion.div
                className="h-10 w-10 rounded-full bg-main dark:bg-main flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </motion.div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-main to-main dark:from-main dark:to-main">
                {t("brand")}
              </span>
            </Link>
            <p className="text-muted-foreground max-w-md">{t("description")}</p>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {t("subscribe.title")}
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                <Input
                  placeholder={t("subscribe.placeholder")}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  className="bg-main hover:bg-main dark:bg-main dark:hover:bg-main text-white"
                  disabled={isSubscribing || subscribed}
                >
                  {isSubscribing ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></span>
                  ) : subscribed ? (
                    t("subscribe.success")
                  ) : (
                    t("subscribe.button")
                  )}
                </Button>
              </form>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">
              {t("product.title")}
            </h3>
            <div className="space-y-3">
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("product.features")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("product.pricing")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("product.roadmap")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("product.documentation")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">
              {t("company.title")}
            </h3>
            <div className="space-y-3">
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("company.about")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("company.blog")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("company.careers")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("company.contact")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">
              {t("legal.title")}
            </h3>
            <div className="space-y-3">
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("legal.terms")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("legal.privacy")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("legal.cookie")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-main dark:hover:text-main transition-colors flex items-center group"
              >
                <span>{t("legal.dataProcessing")}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
