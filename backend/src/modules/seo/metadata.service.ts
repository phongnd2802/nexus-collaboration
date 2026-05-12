/**
 * Metadata Service
 * Generates SEO metadata for dynamic content
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetadataService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SITE_URL') || 'https://nexusapp.io';
  }

  // Blog-related methods removed - will be implemented separately
}
