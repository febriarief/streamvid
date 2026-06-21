import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import {
  BackblazeAuthorizeResponse,
  BackblazeBucket,
  BackblazeListBucketsResponse,
  BackblazeUploadUrlResponse,
  UploadedThumbnail,
} from './storage.types';

type UploadSourceFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type ResolvedBucket = {
  bucketId: string;
  bucketName: string;
};

@Injectable()
export class StorageService {
  private readonly keyId: string;
  private readonly applicationKey: string;
  private readonly bucketId?: string;
  private readonly bucketName?: string;
  private readonly publicBaseUrl?: string;
  private readonly maxThumbnailSizeInBytes = 5 * 1024 * 1024;
  private readonly allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('BACKBLAZE_B2_KEY_ID') ?? '';
    this.applicationKey = this.configService.get<string>('BACKBLAZE_B2_APPLICATION_KEY') ?? '';
    this.bucketId = this.configService.get<string>('BACKBLAZE_B2_BUCKET_ID') ?? undefined;
    this.bucketName = this.configService.get<string>('BACKBLAZE_B2_BUCKET_NAME') ?? undefined;
    this.publicBaseUrl = this.configService.get<string>('BACKBLAZE_B2_PUBLIC_BASE_URL') ?? undefined;
  }

  async uploadThumbnail(file: UploadSourceFile): Promise<UploadedThumbnail> {
    this.assertConfigured();
    this.validateThumbnailFile(file);

    const authorization = await this.authorize();
    const bucket = await this.resolveBucket(authorization);
    const uploadUrl = await this.getUploadUrl(authorization, bucket.bucketId);
    const fileName = this.buildThumbnailFileName(file.originalname);
    const encodedFileName = encodeURIComponent(fileName).replace(/%2F/g, '/');
    const sha1 = createHash('sha1').update(file.buffer).digest('hex');

    const response = await fetch(uploadUrl.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadUrl.authorizationToken,
        'Content-Type': file.mimetype,
        'Content-Length': file.size.toString(),
        'X-Bz-Content-Sha1': sha1,
        'X-Bz-File-Name': encodedFileName,
      },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to upload thumbnail to Backblaze');
    }

    return {
      fileName,
      url: this.buildPublicFileUrl(bucket.bucketName, fileName, authorization.downloadUrl),
    };
  }

  private assertConfigured(): void {
    if (!this.keyId || !this.applicationKey) {
      throw new InternalServerErrorException('Backblaze storage is not configured');
    }
  }

  private validateThumbnailFile(file: UploadSourceFile): void {
    if (!file) {
      throw new BadRequestException('Thumbnail file is required');
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Thumbnail must be a JPG, PNG, or WEBP image');
    }

    if (file.size > this.maxThumbnailSizeInBytes) {
      throw new BadRequestException('Thumbnail must be 5MB or smaller');
    }
  }

  private async authorize(): Promise<BackblazeAuthorizeResponse> {
    const basicToken = Buffer.from(`${this.keyId}:${this.applicationKey}`).toString('base64');
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to authorize Backblaze account');
    }

    return (await response.json()) as BackblazeAuthorizeResponse;
  }

  private async resolveBucket(
    authorization: BackblazeAuthorizeResponse,
  ): Promise<ResolvedBucket> {
    const bucketId = this.bucketId ?? authorization.allowed?.bucketId;
    const bucketName = this.bucketName ?? authorization.allowed?.bucketName;

    if (bucketId && bucketName) {
      return { bucketId, bucketName };
    }

    const response = await fetch(`${authorization.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        Authorization: authorization.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: authorization.accountId }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to resolve Backblaze bucket');
    }

    const payload = (await response.json()) as BackblazeListBucketsResponse;
    const selectedBucket = this.selectBucket(payload.buckets);

    return selectedBucket;
  }

  private selectBucket(buckets: BackblazeBucket[]): ResolvedBucket {
    if (this.bucketId) {
      const bucket = buckets.find((item) => item.bucketId === this.bucketId);
      if (bucket) {
        return bucket;
      }
    }

    if (this.bucketName) {
      const bucket = buckets.find((item) => item.bucketName === this.bucketName);
      if (bucket) {
        return bucket;
      }
    }

    if (buckets.length === 1) {
      return buckets[0];
    }

    throw new InternalServerErrorException(
      'Backblaze bucket could not be resolved. Set BACKBLAZE_B2_BUCKET_NAME or BACKBLAZE_B2_BUCKET_ID.',
    );
  }

  private async getUploadUrl(
    authorization: BackblazeAuthorizeResponse,
    bucketId: string,
  ): Promise<BackblazeUploadUrlResponse> {
    const response = await fetch(`${authorization.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: authorization.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to prepare Backblaze upload');
    }

    return (await response.json()) as BackblazeUploadUrlResponse;
  }

  private buildThumbnailFileName(originalName: string): string {
    const extension = this.extractExtension(originalName);
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    return `thumbnails/${year}/${month}/${randomUUID()}${extension}`;
  }

  private extractExtension(originalName: string): string {
    const match = originalName.toLowerCase().match(/\.(jpe?g|png|webp)$/);
    return match ? `.${match[1] === 'jpeg' ? 'jpg' : match[1]}` : '.jpg';
  }

  private buildPublicFileUrl(
    bucketName: string,
    fileName: string,
    downloadUrl: string,
  ): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${fileName}`;
    }

    return `${downloadUrl}/file/${bucketName}/${fileName}`;
  }
}

