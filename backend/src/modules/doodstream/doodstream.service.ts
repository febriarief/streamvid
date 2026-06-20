import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoodstreamFileInfo, DoodstreamMetadata } from './doodstream.types';

@Injectable()
export class DoodstreamService {
  private readonly apiKey: string;
  private readonly apiBase = 'https://doodapi.com/api';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('DOODSTREAM_API_KEY') ?? '';
  }

  extractFileCode(url: string): string {
    const match = this.parseSourceUrl(url).pathname.match(/\/d\/([a-zA-Z0-9]+)/);
    if (!match) throw new BadRequestException('Invalid Doodstream URL format');
    return match[1];
  }

  private parseSourceUrl(url: string): URL {
    try {
      return new URL(url);
    } catch {
      throw new BadRequestException('Invalid Doodstream URL format');
    }
  }

  private buildEmbedUrl(sourceUrl: string, doodFileId: string, embedPath?: string): string {
    const parsedSourceUrl = this.parseSourceUrl(sourceUrl);

    if (embedPath) {
      if (/^https?:\/\//i.test(embedPath)) {
        return embedPath;
      }

      const embedMatch = embedPath.match(/\/e\/([a-zA-Z0-9]+)/i);
      if (embedMatch?.[1]) {
        return `${parsedSourceUrl.protocol}//${parsedSourceUrl.host}/e/${embedMatch[1]}`;
      }
    }

    return `${parsedSourceUrl.protocol}//${parsedSourceUrl.host}/e/${doodFileId}`;
  }

  async getMetadata(url: string): Promise<DoodstreamMetadata> {
    const fileCode = this.extractFileCode(url);

    const res = await fetch(
      `${this.apiBase}/file/info?key=${this.apiKey}&file_code=${fileCode}`,
    );

    if (!res.ok) throw new NotFoundException('Failed to fetch from Doodstream API');

    const json = await res.json();

    if (json.status !== 200 || !json.result?.length) {
      throw new NotFoundException('Video not found on Doodstream');
    }

    const file: DoodstreamFileInfo = json.result[0];
    const doodFileId = file.file_code ?? file.filecode;
    const duration =
      typeof file.length === 'string' ? Number.parseInt(file.length, 10) : file.length;

    if (!doodFileId) {
      throw new NotFoundException('Doodstream metadata is missing file identifier');
    }

    return {
      doodFileId,
      title: file.title,
      duration: Number.isNaN(duration) ? 0 : duration,
      thumbnailUrl: file.splash_img || file.single_img || '',
      embedUrl: this.buildEmbedUrl(url, doodFileId, file.protected_embed),
      doodUrl: url,
    };
  }
}
