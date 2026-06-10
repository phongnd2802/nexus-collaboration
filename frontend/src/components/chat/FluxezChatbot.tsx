/**
 * nexus Chatbot Integration for Nexus
 *
 * Lightweight chatbot widget that loads via a simple script tag approach
 * Similar to nexusAnalytics - no SDK required
 *
 * Usage:
 * <script defer data-api-key="anon_xxx" src="https://api.nexusapp.io/js/chatbot.js"></script>
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Get configuration from environment
const nexus_API_KEY = import.meta.env.VITE_nexus_ANON_KEY || '';
const nexus_API_URL = import.meta.env.VITE_nexus_API_URL || 'https://api.nexusapp.io';

// Check if chatbot is enabled
const isChatbotEnabled = (): boolean => {
  return Boolean(nexus_API_KEY && nexus_API_KEY.startsWith('anon_'));
};

// Public pages where chatbot should be shown
const PUBLIC_PATHS = [
  '/',
  '/home',
  '/pricing',
  '/downloads',
  '/products',
  '/features',
  '/privacy',
  '/terms',
  '/cookies',
  '/data-deletion',
  '/careers',
  '/press',
  '/changelog',
  '/support',
];

// Internal paths where chatbot should be hidden
const INTERNAL_PATH_PREFIXES = [
  '/workspaces',
  '/dashboard',
  '/settings',
  '/profile',
  '/admin',
  '/call',
  '/video',
  '/incoming-call',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Check if current path is a public page
const isPublicPage = (pathname: string): boolean => {
  // First check if it's an internal path - always hide
  if (INTERNAL_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return false;
  }
  // Exact matches or starts with public paths
  return PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );
};

interface nexusChatbotProps {
  debug?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
  placeholder?: string;
}

/**
 * nexus Chatbot Component
 *
 * Drop-in component that loads nexus Chatbot script
 * Place in App.tsx to enable the chat widget
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { nexusChatbot } from './components/chat/nexusChatbot';
 *
 * function App() {
 *   return (
 *     <>
 *       <nexusChatbot
 *         debug={process.env.NODE_ENV === 'development'}
 *         position="bottom-right"
 *         primaryColor="#8B5CF6"
 *         greeting="Hi! How can I help you today?"
 *       />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export const NexusChatbot: React.FC<nexusChatbotProps> = ({
  debug = false,
  position = 'bottom-right',
  primaryColor = '#2563EB',
  greeting = 'Hi! How can I help you today?',
  placeholder = 'Type your message...',
}) => {
  const location = useLocation();

  useEffect(() => {
    // Skip if API key is not configured
    if (!isChatbotEnabled()) {
      if (debug) {
        console.log('[nexus Chatbot] Not configured - set VITE_nexus_ANON_KEY');
      }
      return;
    }

    const shouldShow = isPublicPage(location.pathname);

    // Always aggressively close and hide the chatbot first
    if (window.nexusChatbot) {
      try {
        window.nexusChatbot.close();
      } catch (e) {
        if (debug) console.error('[nexus Chatbot] Error closing:', e);
      }
    }

    // Hide all chatbot elements (only used on internal pages)
    const hideAllChatbotElements = () => {
      // Hide everything on internal pages
      const selectors = [
        '#nexus-chatbot-widget',
        '#nexus-chatbot',
        '#nexus-chatbot-container',
        '#nexus-chat-widget',
        '[id*="nexus-chat"]',
        '[class*="nexus-chat"]',
        '[class*="chatbot-widget"]',
        '[class*="chatbot-container"]',
        'iframe[src*="nexus"]',
        'iframe[src*="chatbot"]',
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const htmlEl = el as HTMLElement;
          // Don't hide the script tag
          if (!htmlEl.id || !htmlEl.id.includes('script')) {
            htmlEl.style.display = 'none';
            htmlEl.style.visibility = 'hidden';
            htmlEl.style.opacity = '0';
            htmlEl.style.pointerEvents = 'none';
          }
        });
      });
    };

    // Hide or show chatbot based on page type
    if (!shouldShow) {
      if (debug) {
        console.log('[nexus Chatbot] Hidden on internal page:', location.pathname);
      }
      hideAllChatbotElements();
      return;
    }

    // Show chatbot on public pages (but keep dialog closed, only show button)
    if (debug) {
      console.log('[nexus Chatbot] Showing on public page:', location.pathname);
    }

    // Check if script is already loaded (persists across StrictMode remounts)
    const existingScript = document.getElementById('nexus-chatbot-script');

    // ALWAYS restore visibility when on public page, even if script exists
    // This fixes the issue where bot doesn't show when navigating from internal to public pages
    setTimeout(() => {
      const widgetButtons = document.querySelectorAll(
        '#nexus-chatbot-widget, #nexus-chatbot-button, [class*="chatbot-button"], [class*="chatbot-launcher"]'
      );

      widgetButtons.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.removeProperty('display');
        htmlEl.style.removeProperty('visibility');
        htmlEl.style.removeProperty('opacity');
        htmlEl.style.removeProperty('pointer-events');
      });

      // But keep dialog/container closed
      const dialogs = document.querySelectorAll(
        '[class*="chatbot-dialog"], [class*="chatbot-container"], [class*="chat-window"]'
      );

      dialogs.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.classList.remove('open', 'expanded', 'visible');
      });
    }, 100);

    if (existingScript) {
      if (debug) {
        console.log('[nexus Chatbot] Script already loaded, visibility restored');
      }
      return;
    }

    // Create and inject the script tag
    const script = document.createElement('script');
    script.id = 'nexus-chatbot-script';
    script.defer = true;
    script.src = `${nexus_API_URL}/js/chatbot.js`;
    script.setAttribute('data-api-key', nexus_API_KEY);
    script.setAttribute('data-api-url', nexus_API_URL);
    script.setAttribute('data-position', position);
    script.setAttribute('data-primary-color', primaryColor);
    script.setAttribute('data-greeting', greeting);
    script.setAttribute('data-placeholder', placeholder);
    if (debug) {
      script.setAttribute('data-debug', 'true');
    }

    if (debug) {
      console.log('[nexus Chatbot] Initializing with API URL:', nexus_API_URL);
    }

    script.onload = () => {
      if (debug) {
        console.log('[nexus Chatbot] Script loaded successfully');
      }

      // Force close chatbot on load (prevent auto-open)
      setTimeout(() => {
        if (window.nexusChatbot) {
          window.nexusChatbot.close();
          if (debug) {
            console.log('[nexus Chatbot] Forced closed on load');
          }
        }
      }, 100);

      // Additional force close after a delay
      setTimeout(() => {
        if (window.nexusChatbot) {
          window.nexusChatbot.close();
        }
      }, 500);

      // Aggressive close button handling - use event delegation
      const handleCloseClick = (e: Event) => {
        const target = e.target as HTMLElement;

        // Check if clicked element or its parents are close buttons
        if (
          target.matches('button, [role="button"], svg, path') &&
          (
            target.closest('[class*="close"]') ||
            target.closest('[aria-label*="close" i]') ||
            target.closest('button[class*="chatbot"]') ||
            target.textContent?.includes('×') ||
            target.innerHTML?.includes('×')
          )
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (window.nexusChatbot) {
            window.nexusChatbot.close();
            if (debug) {
              console.log('[nexus Chatbot] Closed via button click');
            }
          }

          // Only hide the dialog/window, NOT the button
          document.querySelectorAll('[class*="chatbot-dialog"], [class*="chatbot-window"], [class*="chat-container"]:not([class*="button"])').forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = 'none';
            htmlEl.classList.remove('open', 'expanded', 'visible');
          });
        }
      };

      // Add event listener to document for close buttons
      document.addEventListener('click', handleCloseClick, true);
      document.addEventListener('mousedown', handleCloseClick, true);

      // Monitor for unexpected auto-opening and force close
      let lastClosedTime = Date.now();
      const observer = new MutationObserver(() => {
        const now = Date.now();

        // Only check if not recently closed (prevent infinite loop)
        if (now - lastClosedTime < 500) return;

        // Check if chatbot dialog/container is open/visible
        const chatbotContainers = document.querySelectorAll(
          '[class*="chatbot-container"], [class*="chatbot-dialog"], [id*="chatbot-dialog"], ' +
          '[class*="nexus-chat-container"], [class*="nexus-chat-widget"]'
        );

        chatbotContainers.forEach(container => {
          const htmlEl = container as HTMLElement;
          const isVisible = (
            htmlEl.style.display !== 'none' &&
            htmlEl.style.visibility !== 'hidden' &&
            (htmlEl.classList.contains('open') ||
             htmlEl.classList.contains('expanded') ||
             htmlEl.classList.contains('visible'))
          );

          // If it's visible but we're on internal page, aggressively close
          if (isVisible && !isPublicPage(window.location.pathname)) {
            if (window.nexusChatbot) {
              window.nexusChatbot.close();
              lastClosedTime = Date.now();
            }
            htmlEl.style.display = 'none';
            htmlEl.classList.remove('open', 'expanded', 'visible');

            if (debug) {
              console.log('[nexus Chatbot] Auto-closed on internal page');
            }
          }
        });
      });

      // Start observing document for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    };

    script.onerror = (e) => {
      console.error('[nexus Chatbot] Failed to load script', e);
    };

    document.head.appendChild(script);

    // No cleanup - let the script persist for the app lifetime
    // This prevents issues with React StrictMode double-mounting
  }, [debug, position, primaryColor, greeting, placeholder, location.pathname]);

  // Add CSS override to control chatbot visibility based on page type
  useEffect(() => {
    const isPublic = isPublicPage(location.pathname);

    // Create or update style tag
    let styleTag = document.getElementById('nexus-chatbot-override-styles') as HTMLStyleElement;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'nexus-chatbot-override-styles';
      document.head.appendChild(styleTag);
    }

    if (!isPublic) {
      // Hide on internal pages - use !important only for internal pages
      styleTag.textContent = `
        [id*="nexus-chat"],
        [class*="nexus-chat"],
        [class*="chatbot-widget"],
        [class*="chatbot-container"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
    } else {
      // Reset styles on public pages - DON'T force display type, just remove hiding
      styleTag.textContent = `
        /* Remove all hiding on public pages */
        [id*="nexus-chat"]:not([class*="dialog"]):not([class*="window"]),
        [class*="nexus-chat"]:not([class*="dialog"]):not([class*="window"]),
        [class*="chatbot-button"],
        [class*="chatbot-launcher"],
        [class*="chatbot-widget"]:not([class*="dialog"]) {
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* But keep dialogs closed unless user opens them */
        [class*="chatbot-dialog"]:not(.open):not(.visible),
        [class*="chatbot-container"]:not(.open):not(.visible),
        [class*="chat-window"]:not(.open):not(.visible) {
          display: none;
        }
      `;

      // Aggressively remove any inline styles and restore visibility
      // Multiple timeouts to catch bot loading at different times
      const restoreVisibility = () => {
        document.querySelectorAll(
          '#nexus-chatbot-widget, #nexus-chatbot-button, ' +
          '[class*="chatbot-button"], [class*="chatbot-launcher"], ' +
          '[id*="nexus-chat"]:not([id*="dialog"]), [class*="nexus-chat"]:not([class*="dialog"])'
        ).forEach(el => {
          const htmlEl = el as HTMLElement;
          // Remove inline hiding styles
          htmlEl.style.removeProperty('display');
          htmlEl.style.removeProperty('visibility');
          htmlEl.style.removeProperty('opacity');
          htmlEl.style.removeProperty('pointer-events');
        });
      };

      // Run multiple times to catch async bot initialization
      setTimeout(restoreVisibility, 50);
      setTimeout(restoreVisibility, 150);
      setTimeout(restoreVisibility, 300);
      setTimeout(restoreVisibility, 500);
    }
  }, [location.pathname]);

  // Add Escape key handler to close chatbot
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (window.nexusChatbot) {
          window.nexusChatbot.close();
          if (debug) {
            console.log('[nexus Chatbot] Closed via Escape key');
          }
        }

        // Only hide the dialog/window, NOT the button
        document.querySelectorAll('[class*="chatbot-dialog"], [class*="chatbot-window"], [class*="chat-container"]:not([class*="button"])').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.display = 'none';
          htmlEl.classList.remove('open', 'expanded', 'visible');
        });
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [debug]);

  // This component doesn't render anything - the script handles the DOM
  return null;
};

// Global nexus chatbot interface (set by chatbot.js script)
declare global {
  interface Window {
    nexusChatbot?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      sendMessage: (message: string) => void;
      setUser: (user: { id?: string; name?: string; email?: string }) => void;
      destroy: () => void;
    };
  }
}

/**
 * Open the chatbot widget
 */
export const opennexusChatbot = (): void => {
  if (window.nexusChatbot) {
    window.nexusChatbot.open();
  }
};

/**
 * Close the chatbot widget
 */
export const closenexusChatbot = (): void => {
  if (window.nexusChatbot) {
    window.nexusChatbot.close();
  }
};

/**
 * Toggle the chatbot widget
 */
export const togglenexusChatbot = (): void => {
  if (window.nexusChatbot) {
    window.nexusChatbot.toggle();
  }
};

/**
 * Send a message programmatically
 */
export const sendnexusMessage = (message: string): void => {
  if (window.nexusChatbot) {
    window.nexusChatbot.sendMessage(message);
  }
};

/**
 * Set user info for the chatbot
 */
export const setnexusChatUser = (user: { id?: string; name?: string; email?: string }): void => {
  if (window.nexusChatbot) {
    window.nexusChatbot.setUser(user);
  }
};

/**
 * Hook to access nexus Chatbot
 * Returns the global nexusChatbot object if available
 */
export const usenexusChatbot = () => {
  return window.nexusChatbot || null;
};

export default NexusChatbot;
