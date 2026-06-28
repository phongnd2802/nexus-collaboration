/**
 * LiveKit video conferencing provider.
 *
 * Works with both LiveKit Cloud (managed) and self-hosted LiveKit Server.
 *
 * Required env vars:
 *   LIVEKIT_URL          - wss://your-project.livekit.cloud   (or wss://your-self-hosted-host)
 *   LIVEKIT_API_KEY      - LiveKit API key
 *   LIVEKIT_API_SECRET   - LiveKit API secret
 *
 * Optional env vars:
 *   LIVEKIT_WEBHOOK_SECRET   - For validating webhook events
 *   LIVEKIT_RECORDING_BUCKET - S3-compatible bucket for recording uploads
 *                              (defaults to STORAGE_BUCKET_DEFAULT if set)
 *
 * Sign up at https://livekit.io/cloud (free tier: 50 monthly meeting minutes
 * + 100 max participants per room) or self-host with the LiveKit docker image.
 *
 * Frontend SDK: livekit-client (npm install livekit-client)
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateRoomOptions,
  Participant,
  RoomToken,
  TokenOptions,
  VideoProvider,
  VideoProviderNotConfiguredError,
  VideoRoom,
} from './video-provider.interface';

export class LiveKitProvider implements VideoProvider {
  readonly name = 'livekit' as const;
  private readonly logger = new Logger('LiveKitProvider');

  private readonly url: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly webhookSecret?: string;

  // Lazy-loaded SDK clients (so the dep is truly optional at runtime)
  private roomService: any;
  private accessTokenClass: any;
  private sdkLoaded = false;

  constructor(config: ConfigService) {
    this.url = config.get<string>('LIVEKIT_URL', '');
    this.apiKey = config.get<string>('LIVEKIT_API_KEY', '');
    this.apiSecret = config.get<string>('LIVEKIT_API_SECRET', '');
    this.webhookSecret = config.get<string>('LIVEKIT_WEBHOOK_SECRET');

    if (this.isAvailable()) {
      this.logger.log(`LiveKit provider configured: ${this.url}`);
    } else {
      this.logger.warn(
        'LiveKit provider selected but not fully configured (LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET missing)',
      );
    }
  }

  isAvailable(): boolean {
    return !!(this.url && this.apiKey && this.apiSecret);
  }

  getClientSdkInfo() {
    return {
      provider: 'livekit',
      serverUrl: this.url,
      publicConfig: {
        // Clients use livekit-client SDK; serverUrl + the JWT from
        // generateToken() is everything they need to join.
      },
    };
  }

  /**
   * Lazy-load livekit-server-sdk only when actually needed. This keeps
   * the dependency optional for deployments that disable video entirely.
   */
  private loadSdk() {
    if (this.sdkLoaded) return;
    if (!this.isAvailable()) {
      throw new VideoProviderNotConfiguredError('livekit', this.missingVars());
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = require('livekit-server-sdk');
      this.roomService = new sdk.RoomServiceClient(this.url, this.apiKey, this.apiSecret);
      this.accessTokenClass = sdk.AccessToken;
      this.sdkLoaded = true;
      this.logger.log('livekit-server-sdk loaded');
    } catch (e: any) {
      throw new Error(
        `LiveKit provider selected but the "livekit-server-sdk" package is not installed. ` +
          `Run: npm install livekit-server-sdk    Original error: ${e.message}`,
      );
    }
  }

  private missingVars(): string[] {
    const out: string[] = [];
    if (!this.url) out.push('LIVEKIT_URL');
    if (!this.apiKey) out.push('LIVEKIT_API_KEY');
    if (!this.apiSecret) out.push('LIVEKIT_API_SECRET');
    return out;
  }

  async createRoom(options: CreateRoomOptions): Promise<VideoRoom> {
    this.loadSdk();
    const room = await this.roomService.createRoom({
      name: options.roomName,
      emptyTimeout: options.emptyTimeout ?? 300,
      maxParticipants: options.maxParticipants ?? 50,
      metadata: options.metadata ?? '',
    });
    return {
      roomId: room.name,
      roomName: room.name,
      createdAt: new Date(Number(room.creationTime) * 1000).toISOString(),
      maxParticipants: options.maxParticipants ?? 50,
      numParticipants: 0,
      metadata: options.metadata,
    };
  }

  async getRoom(roomId: string): Promise<VideoRoom | null> {
    this.loadSdk();
    const rooms = await this.roomService.listRooms([roomId]);
    if (rooms.length === 0) return null;
    const room = rooms[0];
    return {
      roomId: room.name,
      roomName: room.name,
      createdAt: new Date(Number(room.creationTime) * 1000).toISOString(),
      numParticipants: room.numParticipants,
      maxParticipants: room.maxParticipants,
      metadata: room.metadata,
    };
  }

  async listRooms(): Promise<VideoRoom[]> {
    this.loadSdk();
    const rooms = await this.roomService.listRooms();
    return rooms.map((r: any) => ({
      roomId: r.name,
      roomName: r.name,
      createdAt: new Date(Number(r.creationTime) * 1000).toISOString(),
      numParticipants: r.numParticipants,
      maxParticipants: r.maxParticipants,
      metadata: r.metadata,
    }));
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.loadSdk();
    await this.roomService.deleteRoom(roomId);
  }

  async generateToken(roomId: string, options: TokenOptions): Promise<RoomToken> {
    this.loadSdk();
    const token = new this.accessTokenClass(this.apiKey, this.apiSecret, {
      identity: options.identity,
      name: options.name,
      ttl: options.ttl ?? '24h',
    });
    token.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: options.canPublish !== false,
      canSubscribe: options.canSubscribe !== false,
      canPublishData: options.canPublishData !== false,
      roomAdmin: options.isAdmin === true,
    });
    const jwt = await token.toJwt();
    return {
      token: jwt,
      url: this.url,
      provider: 'livekit',
    };
  }

  async listParticipants(roomId: string): Promise<Participant[]> {
    this.loadSdk();
    const participants = await this.roomService.listParticipants(roomId);
    return participants.map((p: any) => ({
      identity: p.identity,
      name: p.name,
      joinedAt: p.joinedAt ? new Date(Number(p.joinedAt) * 1000).toISOString() : undefined,
      isPublishing: (p.tracks || []).length > 0,
      metadata: p.metadata,
    }));
  }

  async removeParticipant(roomId: string, identity: string): Promise<void> {
    this.loadSdk();
    await this.roomService.removeParticipant(roomId, identity);
  }

  /**
   * Validate a LiveKit webhook signature. Used by the webhook controller.
   */
  validateWebhook(body: string, signature: string): boolean {
    if (!this.webhookSecret) return true;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', this.webhookSecret).update(body).digest('base64');
    return hash === signature;
  }
}
