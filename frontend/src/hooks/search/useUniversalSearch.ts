/**
 * Universal Search Hook
 * Provides search functionality with real backend API integration
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchStore } from '../../stores/searchStore';
import {
  universalSearch,
  mapSearchTypes,
  convertFiltersToParams,
  type SearchResultItem
} from '../../services/searchService';

import type {
  SearchQuery,
  UseUniversalSearchReturn,
  SearchResults,
  SearchResult,
  SearchResultAuthor
} from '../../types/search';



/**
 * Check if a string matches a search query (case-insensitive)
 */
const matchesSearchQuery = (text: string | undefined, query: string): boolean => {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Transform backend search result to frontend format
 */
const transformSearchResult = (item: SearchResultItem): SearchResult => {
  // Extract author information
  const authorId = item.created_by || item.user_id || item.uploaded_by || item.organizer_id || item.author_id || 'unknown';
  const author: SearchResultAuthor = {
    id: authorId,
    name: authorId, // TODO: Fetch actual user names
    email: undefined,
    imageUrl: undefined,
  };

  // Base result - all Nexus results have source: 'nexus'
  const baseResult = {
    id: item.id,
    title: item.title || item.name || 'Untitled',
    snippet: item.content_text || item.content || item.description || '',
    author,
    workspace: item.workspace_id,
    highlights: [],
    relevanceScore: item.relevance_score,
    updatedAt: item.updated_at || item.created_at,
    metadata: item,
    source: 'nexus' as const,
    externalUrl: undefined,
  };

  // Type-specific transformations
  switch (item.content_type) {
    case 'messages':
      return {
        ...baseResult,
        type: 'message',
        channel: item.channel_id || item.conversation_id || 'unknown',
        channelType: 'public', // TODO: Determine from data
        timestamp: item.created_at,
        replies: 0,
        reactions: item.reactions || [],
        mentions: item.mentions || [],
        isPinned: item.is_pinned,
        isStarred: item.is_starred,
        attachments: 0,
      };

    case 'files':
      return {
        ...baseResult,
        type: 'file',
        fileType: item.mime_type || 'unknown',
        fileSize: item.size || 0,
        filePath: item.storage_path || '',
        downloadUrl: item.url,
        previewUrl: item.url,
        sharedWith: [],
        parentId: item.folder_id,
      };

    case 'folders':
      return {
        ...baseResult,
        type: 'folder',
        parentId: item.parent_id,
        itemCount: undefined,
        sharedWith: [],
      };

    case 'projects':
      return {
        ...baseResult,
        type: 'project',
        projectType: 'kanban',
        status: (item.status as any) || 'active',
        completionRate: 0,
        teamMembers: [],
        dueDate: item.due_date,
      };

    case 'notes':
      return {
        ...baseResult,
        type: 'note',
        category: undefined,
        tags: item.tags || [],
        wordCount: undefined,
        lastEditedBy: item.created_by,
        sharedWith: [],
      };

    case 'events':
      // Database events are always from Nexus (Google Calendar events are fetched separately)
      return {
        ...baseResult,
        type: 'calendar',
        eventType: 'meeting',
        startTime: item.start_time || '',
        endTime: item.end_time || '',
        location: item.location,
        attendees: item.attendees || [],
        isRecurring: false,
      };

    case 'tasks':
      return {
        ...baseResult,
        type: 'project', // Tasks are shown as project items
        projectType: 'kanban',
        status: (item.status as any) || 'active',
        completionRate: 0,
        teamMembers: item.assigned_to ? [item.assigned_to] : [],
        dueDate: item.due_date,
      };

    default:
      return {
        ...baseResult,
        type: 'note',
        category: undefined,
        tags: [],
        wordCount: undefined,
        lastEditedBy: undefined,
        sharedWith: [],
      };
  }
};

export function useUniversalSearch(): UseUniversalSearchReturn {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    results,
    isSearching,
    totalResults,
    relevanceScore,
    filters,
    setResults,
    setIsSearching,
    updateFilters,
    clearResults,
    addToHistory,
  } = useSearchStore();

  const search = useCallback(
    async (query: SearchQuery) => {
      if (!query.query || query.query.trim().length === 0) {
        clearResults();
        return;
      }

      if (!workspaceId) {
        console.error('[useUniversalSearch] No workspaceId available');
        return;
      }

      setIsSearching(true);

      try {
        // Map frontend types to backend types
        const types = mapSearchTypes(query.type);

        // Convert filters to API params
        const filterParams = convertFiltersToParams(query.filters || {});

        // Backend search
        const backendResponse = await universalSearch(workspaceId, {
          query: query.query,
          types,
          page: 1,
          limit: 50,
          semantic: query.mode === 'semantic' || query.mode === 'hybrid',
          ...filterParams,
        });

        // Transform results by content type
        const transformedResults: SearchResults = {};
        const allResults: SearchResult[] = [];

        // Process backend results
        backendResponse.data.forEach((item) => {
          const transformed = transformSearchResult(item);
          allResults.push(transformed);

          // Group by TRANSFORMED type (not backend content_type)
          // This ensures tasks and projects are grouped together as 'projects'
          let groupKey: string = transformed.type;

          // Map transformed types to frontend tab keys (plural forms)
          const typeToKeyMap: Record<string, string> = {
            'message': 'messages',
            'file': 'files',
            'folder': 'folders',
            'project': 'projects',
            'note': 'notes',
            'calendar': 'calendar',
            'video': 'videos'
          };

          groupKey = typeToKeyMap[groupKey] || groupKey;

          if (!transformedResults[groupKey]) {
            transformedResults[groupKey] = [];
          }
          transformedResults[groupKey]!.push(transformed as any);
        });

        // Add 'all' category
        transformedResults.all = allResults;

        console.log('[useUniversalSearch] Search results:', {
          total: backendResponse.total,
          grouped: Object.keys(transformedResults).reduce((acc, key) => {
            acc[key] = transformedResults[key]?.length || 0;
            return acc;
          }, {} as Record<string, number>)
        });

        setResults(transformedResults);
        addToHistory(query.query);
      } catch (error) {
        console.error('[useUniversalSearch] Search error:', error);
        clearResults();
      } finally {
        setIsSearching(false);
      }
    },
    [workspaceId, setResults, setIsSearching, clearResults, addToHistory]
  );

  return {
    results,
    isSearching,
    totalResults,
    relevanceScore,
    search,
    clearResults,
    filters,
    updateFilters,
  };
}
