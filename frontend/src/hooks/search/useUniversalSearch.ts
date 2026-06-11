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

import { emailService, type EmailListItem } from '../../lib/api/email-api';
import type {
  SearchQuery,
  UseUniversalSearchReturn,
  SearchResults,
  SearchResult,
  SearchResultAuthor,
  EmailSearchResult
} from '../../types/search';



/**
 * Check if a string matches a search query (case-insensitive)
 */
const matchesSearchQuery = (text: string | undefined, query: string): boolean => {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Transform email list item to search result format
 */
const transformEmailToSearchResult = (email: EmailListItem, source: 'gmail' | 'smtp-imap'): EmailSearchResult => {
  return {
    id: email.id,
    type: 'email',
    title: email.subject || '(No subject)',
    snippet: email.snippet || '',
    author: {
      id: email.from?.email || 'unknown',
      name: email.from?.name || email.from?.email || 'Unknown',
      email: email.from?.email,
      imageUrl: undefined,
    },
    workspace: undefined,
    highlights: [],
    relevanceScore: undefined,
    updatedAt: email.date || new Date().toISOString(),
    metadata: email,
    source: source,
    externalUrl: undefined,
    from: email.from,
    to: undefined, // Not available in list item
    subject: email.subject,
    date: email.date,
    isRead: email.isRead,
    isStarred: email.isStarred,
    hasAttachments: email.hasAttachments,
    labelIds: email.labelIds,
    threadId: email.threadId,
  };
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

        // Determine if we should search emails (for all or emails searches)
        const shouldSearchEmails = query.type === 'all' || query.type === 'emails';

        // Run searches in parallel
        const [backendResponse, gmailResponse, imapResponse] = await Promise.all([
          // Backend search
          universalSearch(workspaceId, {
            query: query.query,
            types,
            page: 1,
            limit: 50,
            semantic: query.mode === 'semantic' || query.mode === 'hybrid',
            ...filterParams,
          }),
          // Gmail search
          shouldSearchEmails
            ? emailService.getMessages(workspaceId, {
                query: query.query,
                maxResults: 50,
              }).catch((err) => {
                console.warn('[useUniversalSearch] Gmail search failed (may not be connected):', err.message);
                return { emails: [] };
              })
            : Promise.resolve({ emails: [] }),
          // SMTP/IMAP email search - fetch all and filter client-side (IMAP SEARCH can be unreliable)
          shouldSearchEmails
            ? emailService.getSmtpImapMessages(workspaceId, {
                maxResults: 100, // Fetch more emails, filter client-side
              }).then((response) => {
                console.log('[useUniversalSearch] IMAP raw response (before filter):', response?.emails?.length || 0, 'emails');
                // Filter emails client-side by search query
                if (response?.emails && response.emails.length > 0) {
                  const searchLower = query.query.toLowerCase();
                  response.emails = response.emails.filter((email) =>
                    (email.subject?.toLowerCase().includes(searchLower)) ||
                    (email.snippet?.toLowerCase().includes(searchLower)) ||
                    (email.from?.name?.toLowerCase().includes(searchLower)) ||
                    (email.from?.email?.toLowerCase().includes(searchLower))
                  );
                  console.log('[useUniversalSearch] IMAP filtered results:', response.emails.length);
                }
                return response;
              }).catch((err) => {
                console.error('[useUniversalSearch] IMAP search failed:', err.message, err.response?.data || err);
                return { emails: [] };
              })
            : Promise.resolve({ emails: [] }),
        ]);

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

        const driveResponse = { files: [] as any[] };

        // Process Gmail results
        if (gmailResponse && gmailResponse.emails && gmailResponse.emails.length > 0) {
          gmailResponse.emails.forEach((email: EmailListItem) => {
            const transformed = transformEmailToSearchResult(email, 'gmail');
            allResults.push(transformed);

            // Merge into emails category
            if (!transformedResults.emails) {
              transformedResults.emails = [];
            }
            transformedResults.emails.push(transformed);
          });

          console.log('[useUniversalSearch] Gmail emails found:', gmailResponse.emails.length);
        }

        // Process IMAP results
        if (imapResponse && imapResponse.emails && imapResponse.emails.length > 0) {
          imapResponse.emails.forEach((email: EmailListItem) => {
            const transformed = transformEmailToSearchResult(email, 'smtp-imap');
            allResults.push(transformed);

            // Merge into emails category
            if (!transformedResults.emails) {
              transformedResults.emails = [];
            }
            transformedResults.emails.push(transformed);
          });

          console.log('[useUniversalSearch] IMAP emails found:', imapResponse.emails.length);
        }

        // Add 'all' category
        transformedResults.all = allResults;

        const totalEmails = (gmailResponse?.emails?.length || 0) + (imapResponse?.emails?.length || 0);
        console.log('[useUniversalSearch] Search results:', {
          total: backendResponse.total + totalEmails,
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
