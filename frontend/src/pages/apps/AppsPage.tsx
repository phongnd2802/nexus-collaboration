import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useIntegrationCatalog,
  useUserConnections,
  type IntegrationCatalogEntry,
  type IntegrationConnection,
} from '@/lib/api/integrations-api';
import { IntegrationConnectButton } from '@/pages/integrations/components/IntegrationConnectButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Check, ExternalLink, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Whether a catalog integration is "connectable right now" is decided
// by the backend: each catalog entry returns `credentialConfigured`,
// which is true when the operator has set the required env vars
// (OAuth client id/secret, or the api_key env var). No hardcoded
// list here — previously a 6-slug whitelist silently hid every other
// integration in the catalog.

// Category tab definitions - grouped by functionality
const CATEGORY_TABS: Array<{ id: string; categories: string[] }> = [
  { id: 'all', categories: [] },
  { id: 'communication', categories: ['COMMUNICATION', 'VIDEO_CONFERENCING', 'SOCIAL_MEDIA'] },
  { id: 'productivity', categories: ['FILE_STORAGE', 'CALENDAR', 'EMAIL', 'DOCUMENTATION', 'PRODUCTIVITY'] },
  { id: 'development', categories: ['DEVELOPMENT'] },
  { id: 'business', categories: ['CRM', 'FINANCE', 'HR', 'ECOMMERCE', 'PROJECT_MANAGEMENT'] },
  { id: 'marketing', categories: ['MARKETING', 'ANALYTICS'] },
  { id: 'design', categories: ['DESIGN'] },
  { id: 'ai', categories: ['AI', 'AUTOMATION'] },
  { id: 'security', categories: ['SECURITY', 'SUPPORT'] },
];

// Integration card for catalog items
function IntegrationCard({
  integration,
  connection,
  isConfigured = false,
}: {
  integration: IntegrationCatalogEntry;
  connection?: IntegrationConnection;
  isConfigured?: boolean;
}) {
  const intl = useIntl();
  const isConnected = !!connection;

  return (
    <Card className={cn(
      "transition-colors h-full flex flex-col",
      isConfigured
        ? "hover:border-primary/50"
        : "opacity-60 bg-muted/30 border-dashed"
    )}>
      <CardHeader className="flex flex-row items-start gap-4 flex-1">
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          isConfigured ? "bg-muted" : "bg-muted/50"
        )}>
          <Avatar className={cn("w-10 h-10", !isConfigured && "grayscale")}>
            <AvatarImage src={integration.logoUrl} alt={integration.name} />
            <AvatarFallback>{integration.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className={cn("text-base truncate", !isConfigured && "text-muted-foreground")}>
              {integration.name}
            </CardTitle>
            {isConnected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 shrink-0">
                <Check className="w-3 h-3 mr-1" />
                {intl.formatMessage({ id: 'integrations.status.connected', defaultMessage: 'Connected' })}
              </Badge>
            ) : !isConfigured && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                {intl.formatMessage({ id: 'integrations.status.comingSoon', defaultMessage: 'Coming Soon' })}
              </Badge>
            )}
          </div>
          <CardDescription className={cn("mt-1 line-clamp-2 text-sm", !isConfigured && "text-muted-foreground/70")}>
            {integration.description}
          </CardDescription>
          {integration.category && (
            <Badge variant="outline" className={cn("mt-2 text-xs", !isConfigured && "opacity-50")}>
              {integration.category.replace(/_/g, ' ')}
            </Badge>
          )}
          {connection?.externalEmail && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} {connection.externalEmail}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isConfigured ? (
          <IntegrationConnectButton
            integration={integration}
            connection={connection}
            className="w-full"
            size="sm"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full text-muted-foreground"
          >
            {intl.formatMessage({ id: 'apps.actions.notAvailable', defaultMessage: 'Not Available' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AppsGrid() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const intl = useIntl();

  // UI State
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  // Fetch catalog integrations
  const { data: catalogData, isLoading: catalogLoading } = useIntegrationCatalog({ limit: 200 });
  const { data: connectionsData } = useUserConnections(workspaceId || '');

  // Filter integrations by selected tab and search query
  const filteredIntegrations = useMemo(() => {
    let integrations = catalogData?.integrations || [];

    // Filter by category tab
    if (selectedTab !== 'all') {
      const tab = CATEGORY_TABS.find(t => t.id === selectedTab);
      if (tab && tab.categories.length > 0) {
        integrations = integrations.filter(i =>
          i.category && tab.categories.includes(i.category)
        );
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      integrations = integrations.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.description?.toLowerCase().includes(query) ||
        i.category?.toLowerCase().includes(query) ||
        i.provider?.toLowerCase().includes(query)
      );
    }

    return integrations;
  }, [catalogData, selectedTab, searchQuery]);

  // Get connection for an integration
  const getConnection = (integrationId: string): IntegrationConnection | undefined => {
    return connectionsData?.connections?.find(
      (c) => c.integrationId === integrationId && c.status === 'active'
    );
  };

  // Mark initial load complete once the workspace is resolved
  useEffect(() => {
    setIsLoading(false);
  }, [workspaceId]);

  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCount = filteredIntegrations.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{intl.formatMessage({ id: 'apps.page.title', defaultMessage: 'Connectors' })}</h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: 'apps.page.subtitle', defaultMessage: "Connect external apps to extend Nexus's capabilities" })}
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'apps.page.searchPlaceholder', defaultMessage: 'Search connectors...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground self-center">
          {intl.formatMessage(
            { id: 'apps.page.connectorsAvailable', defaultMessage: '{count} connectors available' },
            { count: totalCount, plural: totalCount !== 1 ? 's' : '' }
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                'whitespace-nowrap',
                selectedTab === tab.id && 'shadow-sm'
              )}
            >
              {intl.formatMessage({
                id: `apps.categories.${tab.id === 'ai' ? 'aiAutomation' : tab.id}`,
                defaultMessage: tab.id === 'all' ? 'All' :
                               tab.id === 'communication' ? 'Communication' :
                               tab.id === 'productivity' ? 'Productivity' :
                               tab.id === 'development' ? 'Development' :
                               tab.id === 'business' ? 'Business' :
                               tab.id === 'marketing' ? 'Marketing' :
                               tab.id === 'design' ? 'Design' :
                               tab.id === 'ai' ? 'AI & Automation' :
                               tab.id === 'security' ? 'Security' : tab.id
              })}
            </Button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Catalog integrations. `isConfigured` comes from the server
            (`credentialConfigured`), which is true iff the operator has
            set the required OAuth / api_key env vars for this integration. */}
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connection={getConnection(integration.id)}
            isConfigured={integration.credentialConfigured ?? false}
          />
        ))}
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {intl.formatMessage({ id: 'apps.page.noConnectorsFound', defaultMessage: 'No connectors found' })}
            </h3>
            <p className="text-sm">
              {searchQuery
                ? intl.formatMessage({ id: 'apps.page.noConnectorsMatch', defaultMessage: 'No connectors match "{query}"' }, { query: searchQuery })
                : intl.formatMessage(
                    { id: 'apps.page.noConnectorsInCategory', defaultMessage: 'No connectors in {category}' },
                    { category: intl.formatMessage({
                      id: `apps.categories.${selectedTab === 'ai' ? 'aiAutomation' : selectedTab}`,
                      defaultMessage: selectedTab === 'all' ? 'All' :
                                     selectedTab === 'communication' ? 'Communication' :
                                     selectedTab === 'productivity' ? 'Productivity' :
                                     selectedTab === 'development' ? 'Development' :
                                     selectedTab === 'business' ? 'Business' :
                                     selectedTab === 'marketing' ? 'Marketing' :
                                     selectedTab === 'design' ? 'Design' :
                                     selectedTab === 'ai' ? 'AI & Automation' :
                                     selectedTab === 'security' ? 'Security' : selectedTab
                    }) }
                  )
              }
            </p>
            {(searchQuery || selectedTab !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTab('all');
                }}
              >
                {intl.formatMessage({ id: 'apps.page.clearFilters', defaultMessage: 'Clear filters' })}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppsPage() {
  return (
    <Routes>
      <Route path="/" element={<AppsGrid />} />
    </Routes>
  );
}

export default AppsPage;
