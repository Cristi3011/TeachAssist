import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private enabled: boolean;

  constructor() {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
    this.bucket = (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '').toString();
    const accessKey = (process.env.AWS_KEY || process.env.AWS_ACCESS_KEY_ID || '').toString();
    const secretKey = (process.env.AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY || '').toString();
    const endpoint = (process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || '').toString();
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';

    this.enabled = !!(this.bucket && accessKey && secretKey);
    if (this.enabled) {
      const clientOpts: any = {
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      };
      if (endpoint) clientOpts.endpoint = endpoint;
      if (forcePathStyle) clientOpts.forcePathStyle = true;

      this.s3 = new S3Client(clientOpts);
    } else {
      this.s3 = new S3Client({ region });
    }
  }

  async getPresignedPutUrl(key: string, contentType: string, expiresSec = 3600) {
    if (!this.enabled) {
      throw new BadRequestException('S3 storage not configured; uploads to S3 are required');
    }
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresSec });
  }

  async getPresignedGetUrl(key: string, expiresSec = 900) {
    if (!this.enabled) {
      throw new BadRequestException('S3 storage not configured; cannot generate GET URL');
    }
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresSec });
  }

  isEnabled() {
    return !!this.enabled;
  }
}
