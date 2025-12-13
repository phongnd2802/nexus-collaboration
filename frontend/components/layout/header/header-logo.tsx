import { motion } from "framer-motion";
import Link from "next/link";

export const HeaderLogo = () => (
  <Link href="/" className="flex items-center gap-2">
    <motion.div
      className="h-10 w-10 rounded-full bg-main flex items-center justify-center"
      whileHover={{ scale: 1.05, rotate: 360 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </motion.div>
    <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-main to-main">
      Nexus
    </span>
  </Link>
);