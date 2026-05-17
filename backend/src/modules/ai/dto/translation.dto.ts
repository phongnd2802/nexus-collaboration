import { IsString, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LanguageCode {
  ENGLISH = 'en',
  VIETNAMESE = 'vi',
}

export enum TranslationStyle {
  FORMAL = 'formal',
  INFORMAL = 'informal',
  TECHNICAL = 'technical',
  LITERARY = 'literary',
  BUSINESS = 'business',
  ACADEMIC = 'academic',
  CASUAL = 'casual',
  MEDICAL = 'medical',
  LEGAL = 'legal',
  MARKETING = 'marketing',
}

export enum TranslationContext {
  GENERAL = 'general',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  MEDICAL = 'medical',
  LEGAL = 'legal',
  ACADEMIC = 'academic',
  LITERATURE = 'literature',
  NEWS = 'news',
  SOCIAL_MEDIA = 'social_media',
  WEBSITE = 'website',
  MOBILE_APP = 'mobile_app',
  MARKETING = 'marketing',
  EDUCATION = 'education',
  TRAVEL = 'travel',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  TECHNOLOGY = 'technology',
  ENTERTAINMENT = 'entertainment',
}

export class TranslateTextDto {
  @ApiProperty({ description: 'Text to translate', example: 'Hello, how are you today?' })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Target language code',
    enum: LanguageCode,
    example: LanguageCode.VIETNAMESE,
  })
  @IsEnum(LanguageCode)
  target_language: LanguageCode;

  @ApiPropertyOptional({
    description: 'Source language code (auto-detected if not provided)',
    enum: LanguageCode,
    example: LanguageCode.ENGLISH,
  })
  @IsOptional()
  @IsEnum(LanguageCode)
  source_language?: LanguageCode;

  @ApiPropertyOptional({
    description: 'Translation style',
    enum: TranslationStyle,
    example: TranslationStyle.FORMAL,
    default: TranslationStyle.FORMAL,
  })
  @IsOptional()
  @IsEnum(TranslationStyle)
  style?: TranslationStyle;

  @ApiPropertyOptional({
    description: 'Context for better translation accuracy',
    enum: TranslationContext,
    example: TranslationContext.BUSINESS,
    default: TranslationContext.GENERAL,
  })
  @IsOptional()
  @IsEnum(TranslationContext)
  context?: TranslationContext;

  @ApiPropertyOptional({
    description: 'Preserve formatting (HTML, markdown, etc.)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  preserve_formatting?: boolean;

  @ApiPropertyOptional({ description: 'Include confidence score in response', default: false })
  @IsOptional()
  @IsBoolean()
  include_confidence?: boolean;

  @ApiPropertyOptional({ description: 'Include alternative translations', default: false })
  @IsOptional()
  @IsBoolean()
  include_alternatives?: boolean;

  @ApiPropertyOptional({
    description: 'Glossary terms for consistent translation',
    example: [{ source: 'API', target: 'API' }],
  })
  @IsOptional()
  @IsArray()
  glossary?: Array<{ source: string; target: string }>;

  @ApiPropertyOptional({ description: 'Cultural adaptation for target audience', default: false })
  @IsOptional()
  @IsBoolean()
  cultural_adaptation?: boolean;

  @ApiPropertyOptional({ description: 'Additional context or notes for the translator' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchTranslateDto {
  @ApiProperty({
    description: 'Array of texts to translate',
    example: ['Hello', 'Goodbye', 'Thank you'],
  })
  @IsArray()
  @IsString({ each: true })
  texts: string[];

  @ApiProperty({
    description: 'Target language code',
    enum: LanguageCode,
    example: LanguageCode.VIETNAMESE,
  })
  @IsEnum(LanguageCode)
  target_language: LanguageCode;

  @ApiPropertyOptional({
    description: 'Source language code (auto-detected if not provided)',
    enum: LanguageCode,
    example: LanguageCode.ENGLISH,
  })
  @IsOptional()
  @IsEnum(LanguageCode)
  source_language?: LanguageCode;

  @ApiPropertyOptional({
    description: 'Translation style',
    enum: TranslationStyle,
    example: TranslationStyle.FORMAL,
    default: TranslationStyle.FORMAL,
  })
  @IsOptional()
  @IsEnum(TranslationStyle)
  style?: TranslationStyle;

  @ApiPropertyOptional({
    description: 'Context for better translation accuracy',
    enum: TranslationContext,
    example: TranslationContext.BUSINESS,
    default: TranslationContext.GENERAL,
  })
  @IsOptional()
  @IsEnum(TranslationContext)
  context?: TranslationContext;

  @ApiPropertyOptional({
    description: 'Preserve formatting (HTML, markdown, etc.)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  preserve_formatting?: boolean;

  @ApiPropertyOptional({ description: 'Glossary terms for consistent translation' })
  @IsOptional()
  @IsArray()
  glossary?: Array<{ source: string; target: string }>;
}
