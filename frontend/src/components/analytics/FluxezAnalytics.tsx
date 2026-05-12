/**
 * nexus Analytics Integration for Nexus
 *
 * Lightweight, privacy-first analytics similar to Plausible/Umami
 * Uses a simple script tag approach - no SDK required
 *
 * Usage:
 * <script defer data-api-key="anon_xxx" src="https://api.nexusapp.io/js/analytics.js"></script>
 */

import { useEffect } from 'react';

// Get configuration from environment
const nexus_API_KEY = import.meta.env.VITE_nexus_ANON_KEY || '';
const nexus_API_URL = import.meta.env.VITE_nexus_API_URL || 'https://api.nexusapp.io';

// Check if analytics is enabled
const isAnalyticsEnabled = (): boolean => {
  return Boolean(nexus_API_KEY && nexus_API_KEY.startsWith('anon_'));
};

interface nexusAnalyticsProps {
  debug?: boolean;
}

/**
 * nexus Analytics Component
 *
 * Drop-in component that loads nexus Analytics script
 * Place in App.tsx to enable tracking
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { nexusAnalytics } from './components/analytics/nexusAnalytics';
 *
 * function App() {
 *   return (
 *     <>
 *       <nexusAnalytics debug={process.env.NODE_ENV === 'development'} />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export const NexusAnalytics: React.FC<nexusAnalyticsProps> = ({ debug = false }) => {
  useEffect(() => {
    // Skip if API key is not configured
    if (!isAnalyticsEnabled()) {
      if (debug) {
        console.log('[nexus Analytics] Not configured - set VITE_nexus_ANON_KEY');
      }
      return;
    }

    // Check if script is already loaded (persists across StrictMode remounts)
    const existingScript = document.getElementById('nexus-analytics-script');
    if (existingScript) {
      if (debug) {
        console.log('[nexus Analytics] Script already loaded');
      }
      return;
    }

    // Create and inject the script tag
    const script = document.createElement('script');
    script.id = 'nexus-analytics-script';
    script.defer = true;
    script.src = `${nexus_API_URL}/js/analytics.js`;
    script.setAttribute('data-api-key', nexus_API_KEY);
    script.setAttribute('data-api-url', nexus_API_URL);
    if (debug) {
      script.setAttribute('data-debug', 'true');
    }

    if (debug) {
      console.log('[nexus Analytics] Initializing with API URL:', nexus_API_URL);
    }

    script.onload = () => {
      if (debug) {
        console.log('[nexus Analytics] Script loaded successfully');
      }
    };

    script.onerror = (e) => {
      console.error('[nexus Analytics] Failed to load script', e);
    };

    document.head.appendChild(script);

    // No cleanup - let the script persist for the app lifetime
    // This prevents issues with React StrictMode double-mounting
  }, [debug]);

  // This component doesn't render anything
  return null;
};

// Global nexus interface (set by analytics.js script)
declare global {
  interface Window {
    nexus?: {
      track: (eventName: string, properties?: Record<string, any>) => void;
      pageview: () => void;
    };
  }
}

/**
 * Track a custom event
 *
 * @example
 * ```tsx
 * tracknexusEvent('signup_started', { plan: 'pro' });
 * ```
 */
export const tracknexusEvent = (
  eventName: string,
  properties?: Record<string, any>
): void => {
  if (window.nexus) {
    window.nexus.track(eventName, properties);
  }
};

/**
 * Track page view manually (usually auto-tracked)
 */
export const tracknexusPageView = (): void => {
  if (window.nexus) {
    window.nexus.pageview();
  }
};

/**
 * Hook to access nexus Analytics
 * Returns the global nexus object if available
 */
export const usenexusAnalytics = () => {
  return window.nexus || null;
};

export default NexusAnalytics;
