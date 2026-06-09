import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  BadRequestException,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import type { Request, Response } from 'express';
import { existsSync, mkdirSync, createWriteStream, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('presign')
  async presign(@Body() body: { filename: string; contentType: string }) {
    if (!body || !body.filename) throw new BadRequestException('filename required');
    const safe = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;
    const url = await this.storage.getPresignedPutUrl(key, body.contentType || 'application/octet-stream');
    return { url, key };
  }

  @Get('get-url')
  async getUrl(@Query('key') key?: string) {
    if (!key) throw new BadRequestException('key required');
    const url = await this.storage.getPresignedGetUrl(key);
    return { url };
  }

  @Put('local-upload')
  async localUpload(@Query('key') key: string | undefined, @Req() req: Request, @Res() res: Response) {
    if (this.storage.isEnabled()) return res.status(501).send('local upload disabled when S3 is configured');
    if (!key) return res.status(400).send('key required');
    const safeKey = key.replace(/(^\/+|\.{2,})/g, '');
    const uploadsRoot = join(process.cwd(), 'uploads');
    const destPath = join(uploadsRoot, safeKey);
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    const ws = createWriteStream(destPath);
    req.pipe(ws);
    ws.on('finish', () => {
      return res.status(200).send('ok');
    });
    ws.on('error', (err) => {
      console.error('local upload write error', err);
      return res.status(500).send('write error');
    });
  }

  @Get('local-get')
  async localGet(@Query('key') key: string | undefined, @Query('download') download: string | undefined, @Res() res: Response) {
    if (this.storage.isEnabled()) return res.status(501).send('local get disabled when S3 is configured');
    if (!key) return res.status(400).send('key required');
    const safeKey = key.replace(/(^\/+|\.{2,})/g, '');
    const filePath = join(process.cwd(), 'uploads', safeKey);
    if (!existsSync(filePath)) return res.status(404).send('not found');
    try {
      const stat = statSync(filePath);
      res.setHeader('Content-Length', String(stat.size));
    } catch {}

    try {
      const name = basename(safeKey) || 'file';
      const disposition = download ? `attachment; filename="${name}"` : `inline; filename="${name}"`;
      res.setHeader('Content-Disposition', disposition);
    } catch {}

    return res.sendFile(filePath);
  }
}
