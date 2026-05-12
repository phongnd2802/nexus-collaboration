/**
 * AuthLogo Component
 * Reusable clickable Nexus logo for auth pages
 */

import { Link } from 'react-router-dom';

export function AuthLogo() {
  return (
    <Link to="/" className="flex items-center gap-3 group cursor-pointer mb-2">
      <img
        src="/nexus-logo.png"
        alt="Nexus Logo"
        className="w-12 h-12 transition-all duration-300 group-hover:scale-110"
      />
      <span className="text-gray-900 dark:text-white font-black text-2xl tracking-tight">
        Nexus
      </span>
    </Link>
  );
}
