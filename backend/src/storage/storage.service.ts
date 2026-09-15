import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StorageService {
  private readonly internalClient: S3Client;
  private readonly publicSigningClient: S3Client;
  private readonly privateBucket: string;
  private readonly publicBucket: string;

  constructor(private readonly prisma: PrismaService) {
    for (const key of ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_PRIVATE_BUCKET', 'S3_PUBLIC_BUCKET']) {
      if (!process.env[key]) throw new Error(`${key} is required`);
    }

    this.privateBucket = process.env.S3_PRIVATE_BUCKET!;
    this.publicBucket = process.env.S3_PUBLIC_BUCKET!;

    const common = {
      region: process.env.S3_REGION || 'auto',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    };

    this.internalClient = new S3Client({
      ...common,
      endpoint: process.env.S3_ENDPOINT,
    });

    // Signed upload URLs are opened by the user's browser, so production must
    // sign against an externally reachable S3 endpoint rather than the Docker
    // service hostname used by the API for server-to-server object access.
    this.publicSigningClient = new S3Client({
      ...common,
      endpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT,
    });
  }

  async readiness() {
    await Promise.all([
      this.internalClient.send(new HeadBucketCommand({ Bucket: this.privateBucket })),
      this.internalClient.send(new HeadBucketCommand({ Bucket: this.publicBucket })),
    ]);
    return true;
  }

  async presign(userId: string, listingId: string, fileName: string, contentType: string, size: number) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      throw new BadRequestException('IMAGE_TYPE_INVALID');
    }
    if (!Number.isFinite(size) || size <= 0 || size > 12 * 1024 * 1024) {
      throw new BadRequestException('IMAGE_SIZE_INVALID');
    }

    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `${userId}/${listingId}/${randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      Metadata: { original: fileName.slice(0, 120) },
    });

    return {
      key,
      uploadUrl: await getSignedUrl(this.publicSigningClient, command, { expiresIn: 300 }),
    };
  }

  async headPrivate(key: string) {
    const h = await this.internalClient.send(new HeadObjectCommand({ Bucket: this.privateBucket, Key: key }));
    const type = h.ContentType || '';
    const size = Number(h.ContentLength || 0);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type) || size <= 0 || size > 12 * 1024 * 1024) {
      throw new BadRequestException('UPLOADED_IMAGE_INVALID');
    }
    return { type, size };
  }

  async publishImage(imageId: string, sellerId: string) {
    const image = await this.prisma.listingImage.findUnique({
      where: { id: imageId },
      include: { listing: true },
    });
    if (!image || image.listing.sellerId !== sellerId) throw new BadRequestException('IMAGE_NOT_FOUND');

    const object = await this.internalClient.send(new GetObjectCommand({ Bucket: this.privateBucket, Key: image.privateKey }));
    if (!object.Body) throw new BadRequestException('IMAGE_EMPTY');

    const input = Buffer.from(await object.Body.transformToByteArray());
    const output = await sharp(input)
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
    const contentHash = createHash('sha256').update(output).digest('hex');

    const duplicate = await this.prisma.listingImage.findFirst({
      where: {
        contentHash,
        listing: {
          sellerId: { not: sellerId },
          status: { in: ['ACTIVE', 'RESERVED'] },
        },
      },
      select: { id: true },
    });

    const publicKey = `listings/${image.listingId}/${image.id}.webp`;
    await this.internalClient.send(new PutObjectCommand({
      Bucket: this.publicBucket,
      Key: publicKey,
      Body: output,
      ContentType: 'image/webp',
      CacheControl: 'public,max-age=31536000,immutable',
    }));

    await this.prisma.listingImage.update({
      where: { id: image.id },
      data: {
        publicKey,
        contentHash,
        moderationState: duplicate ? 'NEEDS_REVIEW' : 'APPROVED',
      },
    });

    return { duplicate: Boolean(duplicate), publicKey, contentHash };
  }

  publicUrl(key: string | null) {
    if (!key) return null;
    const base = (process.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
    return base ? `${base}/${key}` : null;
  }
}
