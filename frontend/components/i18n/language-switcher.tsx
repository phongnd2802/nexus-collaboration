"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { JSX } from "react";

type Locale = "en" | "vi";

// SVG cờ tròn
const FLAGS_SVG: Record<Locale, JSX.Element> = {
  en: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 32 32"
      className="rounded-full transition-transform duration-200"
    >
      <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#071b65"></rect>
      <path d="M5.101,4h-.101c-1.981,0-3.615,1.444-3.933,3.334L26.899,28h.101c1.981,0,3.615-1.444,3.933-3.334L5.101,4Z" fill="#fff"></path>
      <path d="M22.25,19h-2.5l9.934,7.947c.387-.353,.704-.777,.929-1.257l-8.363-6.691Z" fill="#b92932"></path>
      <path d="M1.387,6.309l8.363,6.691h2.5L2.316,5.053c-.387,.353-.704,.777-.929,1.257Z" fill="#b92932"></path>
      <path d="M5,28h.101L30.933,7.334c-.318-1.891-1.952-3.334-3.933-3.334h-.101L1.067,24.666c.318,1.891,1.952,3.334,3.933,3.334Z" fill="#fff"></path>
      <rect x="13" y="4" width="6" height="24" fill="#fff"></rect>
      <rect x="1" y="13" width="30" height="6" fill="#fff"></rect>
      <rect x="14" y="4" width="4" height="24" fill="#b92932"></rect>
      <rect x="14" y="1" width="4" height="30" transform="translate(32) rotate(90)" fill="#b92932"></rect>
      <path d="M28.222,4.21l-9.222,7.376v1.414h.75l9.943-7.94c-.419-.384-.918-.671-1.471-.85Z" fill="#b92932"></path>
      <path d="M2.328,26.957c.414,.374,.904,.656,1.447,.832l9.225-7.38v-1.408h-.75L2.328,26.957Z" fill="#b92932"></path>
    </svg>
  ),
  vi: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 32 32"
      className="rounded-full transition-transform duration-200"
    >
      <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#c93728"></rect>
      <path
        fill="#ff5"
        d="M18.008 16.366L21.257 14.006 17.241 14.006 16 10.186 14.759 14.006 10.743 14.006 13.992 16.366 12.751 20.186 16 17.825 19.249 20.186 18.008 16.366z"
      ></path>
    </svg>
  ),
};

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (value: Locale) => {
    router.replace(pathname, { locale: value });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="neutral" size="sm" className="h-8 px-3 flex items-center gap-2">
          {FLAGS_SVG[locale]}
          <span className="uppercase">{locale}</span>
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[100px]">
        {(["en", "vi"] as Locale[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className="cursor-pointer flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
            disabled={locale === lang}
          >
            {FLAGS_SVG[lang]}
            <span className="uppercase">{lang}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
