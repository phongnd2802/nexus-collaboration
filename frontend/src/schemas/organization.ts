/**
 * Organization Schema
 * Defines the organization structured data for Nexus
 */

export interface OrganizationSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  foundingDate?: string;
  founders?: Array<{
    '@type': string;
    name: string;
  }>;
  address?: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint?: Array<{
    '@type': string;
    telephone: string;
    contactType: string;
    email?: string;
    availableLanguage?: string[];
  }>;
  sameAs?: string[];
}

/**
 * Generate Organization schema for Nexus
 */
export function generateOrganizationSchema(): OrganizationSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://nexusapp.io';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nexus',
    url: siteUrl,
    logo: `${siteUrl}/nexus-logo.png`,
    description: 'All-in-one workspace platform for team collaboration, project management, and productivity.',
    foundingDate: '2023',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Tech Street',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94105',
      addressCountry: 'US',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4567',
        contactType: 'customer support',
        email: 'support@nexusapp.io',
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4568',
        email: 'sales@nexusapp.io',
        contactType: 'sales',
        availableLanguage: ['English'],
      },
    ],
    sameAs: [
      'https://twitter.com/nexusapp',
      'https://www.facebook.com/nexusapp',
      'https://www.linkedin.com/company/nexusapp',
      'https://github.com/nexusapp',
    ],
  };
}
