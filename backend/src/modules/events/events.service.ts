import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateActivityEventDto, EventsQueryDto, EventType, EventPriority } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventsService {
  constructor(private readonly db: DatabaseService) {}

  async createEvent(workspaceId: string, createEventDto: CreateActivityEventDto, userId: string) {
    const eventData = {
      id: uuidv4(),
      workspace_id: workspaceId,
      user_id: userId,
      event_type: createEventDto.eventType,
      title: createEventDto.title,
      description: createEventDto.description,
      priority: createEventDto.priority || EventPriority.NORMAL,
      metadata: createEventDto.metadata ? JSON.stringify(createEventDto.metadata) : null,
      entity_id: createEventDto.entityId,
      entity_type: createEventDto.entityType,
      tags: createEventDto.tags ? JSON.stringify(createEventDto.tags) : null,
      expires_at: createEventDto.expiresAt,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    const event = await this.db.insert('events', eventData);

    return {
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      tags: event.tags ? JSON.parse(event.tags) : null,
    };
  }

  async findEvents(workspaceId: string, query: EventsQueryDto, userId: string) {
    // Build the base query
    let eventsQuery = this.db.table('events').select('*').where('workspace_id', '=', workspaceId);

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      eventsQuery = eventsQuery.whereIn('event_type', query.eventTypes);
    }

    if (query.priorities && query.priorities.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      eventsQuery = eventsQuery.whereIn('priority', query.priorities);
    }

    if (query.startDate) {
      eventsQuery = eventsQuery.where('created_at', '>=', query.startDate);
    }

    if (query.endDate) {
      eventsQuery = eventsQuery.where('created_at', '<=', query.endDate);
    }

    if (query.entityId) {
      eventsQuery = eventsQuery.where('entity_id', '=', query.entityId);
    }

    if (query.entityType) {
      eventsQuery = eventsQuery.where('entity_type', '=', query.entityType);
    }

    if (query.userId) {
      eventsQuery = eventsQuery.where('user_id', '=', query.userId);
    }

    if (query.search) {
      // For OR conditions in database, we need to use a different approach
      // We'll need to handle this at the database level or use multiple queries
      // For now, we'll search in title first, then description if needed
      eventsQuery = eventsQuery.where('title', 'ilike', `%${query.search}%`);
      // Note: This is a limitation - we can't easily do OR conditions with database
      // Consider using the search() method or creating a database view
    }

    if (query.unreadOnly) {
      eventsQuery = eventsQuery.where('is_read', '=', false);
    }

    if (query.tags && query.tags.length > 0) {
      // Filter by tags - this would need proper JSON querying in production
      for (const tag of query.tags) {
        eventsQuery = eventsQuery.where('tags', 'ilike', `%${tag}%`);
      }
    }

    // Get total count for pagination
    const totalCount = await eventsQuery.count();

    // Get paginated results
    const eventsResult = await eventsQuery
      .orderBy('created_at', query.sortOrder || 'desc')
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .execute();

    const events = eventsResult.data || [];

    // Parse JSON fields
    const processedEvents = events.map((event) => ({
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      tags: event.tags ? JSON.parse(event.tags) : null,
    }));

    // Get event type distribution
    const distributionResult = await this.db
      .table('events')
      .select('event_type')
      .where('workspace_id', '=', workspaceId)
      .where(
        'created_at',
        '>=',
        query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .where('created_at', '<=', query.endDate || new Date().toISOString())
      .groupBy('event_type')
      .execute();

    const distribution = distributionResult.data || [];
    const distributionCounts = await Promise.all(
      distribution.map(async (item) => {
        const count = await this.db
          .table('events')
          .where('workspace_id', '=', workspaceId)
          .where('event_type', '=', item.event_type)
          .where(
            'created_at',
            '>=',
            query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          )
          .where('created_at', '<=', query.endDate || new Date().toISOString())
          .count();
        return { ...item, count };
      }),
    );

    return {
      events: processedEvents,
      pagination: {
        total: totalCount,
        limit: query.limit || 50,
        offset: query.offset || 0,
        pages: Math.ceil(totalCount / (query.limit || 50)),
      },
      distribution: {
        eventTypes: distributionCounts.reduce((acc, item) => {
          acc[item.event_type] = parseInt(item.count as string);
          return acc;
        }, {}),
      },
      summary: {
        totalEvents: totalCount,
        unreadEvents: await this.getUnreadCount(workspaceId, userId),
      },
    };
  }

  async markEventAsRead(workspaceId: string, eventId: string, userId: string) {
    // Verify event exists in workspace
    const eventResult = await this.db
      .table('events')
      .select('*')
      .where('id', '=', eventId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const events = eventResult.data || [];
    if (events.length === 0) {
      throw new NotFoundException('Event not found');
    }

    // Mark as read
    await this.db
      .table('events')
      .where('id', '=', eventId)
      .update({ is_read: true, read_at: new Date().toISOString() });

    return { success: true, message: 'Event marked as read' };
  }

  async markAllEventsAsRead(workspaceId: string, userId: string) {
    await this.db
      .table('events')
      .where('workspace_id', '=', workspaceId)
      .where('is_read', '=', false)
      .update({ is_read: true, read_at: new Date().toISOString() });

    return { success: true, message: 'All events marked as read' };
  }

  async deleteExpiredEvents(workspaceId: string) {
    const now = new Date().toISOString();

    const result = await this.db
      .table('events')
      .where('workspace_id', '=', workspaceId)
      .where('expires_at', '<', now)
      .delete();

    return { deletedCount: result.count || 0 };
  }

  private async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    const result = await this.db
      .table('events')
      .where('workspace_id', '=', workspaceId)
      .where('is_read', '=', false)
      .count();

    return result || 0;
  }

  // Helper method to create system events
  async createSystemEvent(
    workspaceId: string,
    eventType: EventType,
    title: string,
    description?: string,
    metadata?: any,
  ) {
    return this.createEvent(
      workspaceId,
      {
        eventType,
        title,
        description,
        priority: EventPriority.NORMAL,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        entityType: 'system',
      },
      'system', // System user ID
    );
  }
}
