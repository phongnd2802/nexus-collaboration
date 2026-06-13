import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { VideoProvider } from './video-provider.interface';
import { LiveKitProvider } from './livekit.provider';

const log = new Logger('VideoProviderFactory');

export function createVideoProvider(config: ConfigService): VideoProvider {
  const provider = new LiveKitProvider(config);
  log.log(`Selected video provider: livekit (available=${provider.isAvailable()})`);
  return provider;
}

export * from './video-provider.interface';
export { LiveKitProvider } from './livekit.provider';
