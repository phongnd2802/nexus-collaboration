import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { UpdateTabArrangementDto } from './dto/tab-arrangement.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get user notification settings
   */
  async getNotificationSettings(userId: string) {
    try {
      this.logger.log(`Getting notification settings for user: ${userId}`);

      // Get user settings from database
      const result = await this.db
        .table('user_settings')
        .select('*')
        .where('user_id', '=', userId)
        .execute();

      let userSettings = result.data?.[0];

      // If no settings exist, create default settings
      if (!userSettings) {
        this.logger.log(`No settings found for user ${userId}, creating defaults`);

        const defaultSettings = {
          user_id: userId,
          theme: 'light',
          language: 'en',
          date_format: 'MM/dd/yyyy',
          time_format: '12h',
          notifications: this.getDefaultNotificationSettings(),
          privacy: {},
          editor_preferences: {},
          dashboard_layout: {},
          sidebar_collapsed: false,
        };

        const createResult = await this.db.table('user_settings').insert(defaultSettings).execute();

        userSettings = createResult.data?.[0] || defaultSettings;
      }

      // Return notification settings
      return userSettings.notifications || this.getDefaultNotificationSettings();
    } catch (error: any) {
      this.logger.error(`Failed to get notification settings: ${error.message}`, error.stack);

      // Return default settings on error
      return this.getDefaultNotificationSettings();
    }
  }

  /**
   * Update user notification settings
   */
  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    try {
      this.logger.log(`Updating notification settings for user: ${userId}`);

      // Extract timezone from dto (stored inside notifications JSONB, no dedicated column)
      const { timezone, ...notificationSettings } = dto;

      // Get current settings
      const currentSettings = await this.getNotificationSettings(userId);

      // Merge with new settings
      const updatedSettings: any = {
        ...currentSettings,
        ...notificationSettings,
      };

      // If timezone is provided, store it inside the notifications JSONB
      if (timezone) {
        updatedSettings.timezone = timezone;
        this.logger.log(`Updating user timezone to: ${timezone}`);
      }

      // Prepare update object
      const updateData: any = {
        notifications: updatedSettings,
        updated_at: new Date().toISOString(),
      };

      // Update in database
      const result = await this.db
        .table('user_settings')
        .update(updateData)
        .where('user_id', '=', userId)
        .execute();

      this.logger.log(
        `Notification settings updated successfully for user: ${userId}${timezone ? ` with timezone: ${timezone}` : ''}`,
      );

      return updatedSettings;
    } catch (error: any) {
      this.logger.error(`Failed to update notification settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get default notification settings
   */
  private getDefaultNotificationSettings() {
    return {
      email: true,
      push: true,
      desktop: true,
      mentions: true,
      directMessages: true,
      channelMessages: true,
      tasks: true,
      calendar: true,
      marketing: false,
      categories: [
        {
          id: 'messages',
          label: 'Messages',
          description: 'Notifications for direct messages and mentions',
          settings: {
            email: true,
            push: true,
            inApp: true,
          },
        },
        {
          id: 'tasks',
          label: 'Tasks & Projects',
          description: 'Updates on tasks, projects, and assignments',
          settings: {
            email: true,
            push: true,
            inApp: true,
          },
        },
        {
          id: 'calendar',
          label: 'Calendar',
          description: 'Event reminders and calendar updates',
          settings: {
            email: true,
            push: true,
            inApp: true,
          },
        },
        {
          id: 'workspace',
          label: 'Workspace',
          description: 'Workspace announcements and updates',
          settings: {
            email: true,
            push: false,
            inApp: true,
          },
        },
      ],
      generalSettings: {
        doNotDisturb: false,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
        frequency: 'immediate' as const,
        sound: true,
      },
    };
  }

  /**
   * Get user tab arrangement settings
   */
  async getTabArrangement(userId: string) {
    try {
      this.logger.log(`Getting tab arrangement for user: ${userId}`);

      // Get user settings from database
      const result = await this.db
        .table('user_settings')
        .select('tab_arrangement')
        .where('user_id', '=', userId)
        .execute();

      const userSettings = result.data?.[0];

      // If no settings exist or no tab arrangement, return default
      if (
        !userSettings ||
        !userSettings.tab_arrangement ||
        Object.keys(userSettings.tab_arrangement).length === 0
      ) {
        this.logger.log(`No tab arrangement found for user ${userId}, returning default`);
        return this.getDefaultTabArrangement();
      }

      // Return stored tab arrangement with camelCase conversion
      return {
        bottomNavTabIds:
          userSettings.tab_arrangement.bottomNavTabIds ||
          this.getDefaultTabArrangement().bottomNavTabIds,
        moreMenuTabIds:
          userSettings.tab_arrangement.moreMenuTabIds ||
          this.getDefaultTabArrangement().moreMenuTabIds,
        lastModified: userSettings.tab_arrangement.lastModified || null,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get tab arrangement: ${error.message}`, error.stack);
      return this.getDefaultTabArrangement();
    }
  }

  /**
   * Update user tab arrangement settings
   */
  async updateTabArrangement(userId: string, dto: UpdateTabArrangementDto) {
    try {
      this.logger.log(`Updating tab arrangement for user: ${userId}`);

      // Validate that home tab is in bottom nav
      if (!dto.bottomNavTabIds.includes('home')) {
        throw new BadRequestException('Home tab must be in bottom navigation');
      }

      // Validate max 5 tabs in bottom nav
      if (dto.bottomNavTabIds.length > 5) {
        throw new BadRequestException('Cannot have more than 5 tabs in bottom navigation');
      }

      // Check for duplicates within each array
      const bottomNavSet = new Set(dto.bottomNavTabIds);
      const moreMenuSet = new Set(dto.moreMenuTabIds);

      if (bottomNavSet.size !== dto.bottomNavTabIds.length) {
        throw new BadRequestException('Duplicate tabs found in bottom navigation');
      }

      if (moreMenuSet.size !== dto.moreMenuTabIds.length) {
        throw new BadRequestException('Duplicate tabs found in more menu');
      }

      // Check for overlap between bottom nav and more menu
      const overlap = dto.bottomNavTabIds.filter((id) => dto.moreMenuTabIds.includes(id));
      if (overlap.length > 0) {
        throw new BadRequestException(`Tabs cannot be in both sections: ${overlap.join(', ')}`);
      }

      const tabArrangement = {
        bottomNavTabIds: dto.bottomNavTabIds,
        moreMenuTabIds: dto.moreMenuTabIds,
        lastModified: new Date().toISOString(),
      };

      // Check if user settings exist
      const existingResult = await this.db
        .table('user_settings')
        .select('id')
        .where('user_id', '=', userId)
        .execute();

      if (existingResult.data?.length > 0) {
        // Update existing settings
        await this.db
          .table('user_settings')
          .update({
            tab_arrangement: tabArrangement,
            updated_at: new Date().toISOString(),
          })
          .where('user_id', '=', userId)
          .execute();
      } else {
        // Create new settings with tab arrangement
        await this.db
          .table('user_settings')
          .insert({
            user_id: userId,
            tab_arrangement: tabArrangement,
            notifications: this.getDefaultNotificationSettings(),
          })
          .execute();
      }

      this.logger.log(`Tab arrangement updated successfully for user: ${userId}`);

      return tabArrangement;
    } catch (error: any) {
      this.logger.error(`Failed to update tab arrangement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get default tab arrangement
   */
  private getDefaultTabArrangement() {
    return {
      bottomNavTabIds: ['home', 'autopilot', 'messages', 'projects', 'notes'],
      moreMenuTabIds: [
        'calendar',
        'video_calls',
        'files',
        'search',
        'connectors',
        'tools',
        'settings',
      ],
      lastModified: null,
    };
  }
}
