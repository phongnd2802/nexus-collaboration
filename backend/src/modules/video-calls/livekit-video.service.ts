/**
 * Video conferencing service backed by LiveKit.
 *
 * The historical filename is retained for compatibility with existing
 * call sites, but this service now always uses the LiveKit provider.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateRoomOptions,
  Participant,
  RoomToken,
  TokenOptions,
  VideoProvider,
  VideoRoom,
  createVideoProvider,
} from './providers';

@Injectable()
export class LivekitVideoService {
  private readonly logger = new Logger(LivekitVideoService.name);
  private readonly provider: VideoProvider;

  constructor(private readonly config: ConfigService) {
    this.provider = createVideoProvider(this.config);
    this.logger.log(
      `Video provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`,
    );
  }

  /** Returns true if the configured LiveKit provider can actually do work. */
  isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Frontend bootstrap info: which provider is active and the public
   * config the client SDK needs to connect. Returned over an API
   * endpoint so the frontend knows which video SDK to load.
   */
  getProviderInfo() {
    return {
      provider: this.provider.name,
      available: this.provider.isAvailable(),
      ...this.provider.getClientSdkInfo(),
    };
  }

  // ============================================
  // Room Management
  // ============================================

  /**
   * Create a new video conference room.
   * Accepts both the new CreateRoomOptions shape AND the legacy shape
   * (`{name, maxParticipants}` from older callers).
   */
  async createRoom(options: any): Promise<any> {
    const normalized: CreateRoomOptions = {
      roomName: options.roomName || options.name || `room-${Date.now()}`,
      maxParticipants: options.maxParticipants ?? 50,
      emptyTimeout: options.emptyTimeout,
      metadata: options.metadata,
    };
    this.logger.log(`Creating video room: ${normalized.roomName} (provider=${this.provider.name})`);
    const room = await this.provider.createRoom(normalized);
    // Legacy callers expect both `roomId` and `id` fields - synthesize.
    return { ...room, id: room.roomId };
  }

  async getRoom(roomId: string): Promise<VideoRoom | null> {
    return this.provider.getRoom(roomId);
  }

  async listRooms(_filters?: any): Promise<VideoRoom[]> {
    return this.provider.listRooms();
  }

  async updateRoom(_roomId: string, _options: any): Promise<VideoRoom | null> {
    // Most providers don't support in-place room updates - the typical
    // pattern is delete+recreate. Return the current room as a no-op.
    return this.provider.getRoom(_roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.logger.log(`Deleting video room: ${roomId}`);
    return this.provider.deleteRoom(roomId);
  }

  // ============================================
  // Token Generation
  // ============================================

  /**
   * Generate a room access token for a participant.
   * Legacy signature: generateToken(roomId, identity, options?)
   */
  async generateToken(
    roomId: string,
    identityOrOptions: string | TokenOptions,
    options?: any,
  ): Promise<RoomToken> {
    const tokenOptions: TokenOptions =
      typeof identityOrOptions === 'string'
        ? {
            identity: identityOrOptions,
            name: options?.name ?? options?.userName,
            ttl: options?.ttl,
            canPublish: options?.canPublish,
            canSubscribe: options?.canSubscribe,
            canPublishData: options?.canPublishData,
            isAdmin: options?.isAdmin ?? options?.isOwner,
          }
        : identityOrOptions;
    this.logger.log(
      `Generating ${this.provider.name} token for ${tokenOptions.identity} on room ${roomId}`,
    );
    return this.provider.generateToken(roomId, tokenOptions);
  }

  // ============================================
  // Participant Management
  // ============================================

  async getParticipant(roomId: string, participantId: string): Promise<Participant | null> {
    const all = await this.provider.listParticipants(roomId);
    return all.find((p) => p.identity === participantId) ?? null;
  }

  async listParticipants(roomId: string): Promise<Participant[]> {
    return this.provider.listParticipants(roomId);
  }

  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    this.logger.log(`Removing ${participantId} from ${roomId} (provider=${this.provider.name})`);
    return this.provider.removeParticipant(roomId, participantId);
  }

  // ============================================
  // Session Analytics
  // ============================================

  async getSessionStats(_sessionId: string): Promise<any> {
    return null;
  }

  // ============================================
  // Direct provider access (escape hatch)
  // ============================================

  /**
   * Get the underlying VideoProvider instance for advanced use cases.
   * Avoid this if possible - prefer the methods above.
   */
  getProvider(): VideoProvider {
    return this.provider;
  }

  /** Legacy alias used by some call sites. */
  getClient(): VideoProvider {
    return this.provider;
  }
}
