import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateListingDto, CompleteImageDto, PresignImageDto, ReportDto } from './dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  private serial(raw?: string) {
    if (!raw) return { serialHash: null, serialHint: null };
    const pepper = process.env.SERIAL_HASH_PEPPER; if (!pepper || pepper.length < 24) throw new Error('SERIAL_HASH_PEPPER must be at least 24 characters');
    const clean = raw.trim().toUpperCase();
    return { serialHash: createHash('sha256').update(`${pepper}:${clean}`).digest('hex'), serialHint: clean.slice(-4) };
  }
  private publicRow(row: any) {
    return { id: row.id, title: row.title, description: row.description, condition: row.condition, conditionPercent: row.conditionPercent, priceVnd: Number(row.priceVnd), province: row.province, district: row.district, invoiceAvailable: row.invoiceAvailable, nfcAvailable: row.nfcAvailable, serialHint: row.serialHint, status: row.status, publishedAt: row.publishedAt, favoriteCount: Number(row.favoriteCount || 0), model: row.paddleModel ? { id: row.paddleModel.id, name: row.paddleModel.name, slug: row.paddleModel.slug, thicknessMm: row.paddleModel.thicknessMm ? Number(row.paddleModel.thicknessMm) : null, playStyle: row.paddleModel.playStyle, brand: row.paddleModel.brand } : null, customBrand: row.customBrand, customModel: row.customModel, images: (row.images || []).filter((x:any)=>x.moderationState==='APPROVED' && x.publicKey).map((x:any)=>({ id:x.id, sortOrder:x.sortOrder, url:this.storage.publicUrl(x.publicKey) })), seller: row.seller ? { id: row.seller.id, displayName: row.seller.profile?.displayName || 'Người bán ChoVot', sellerScore: row.seller.profile?.sellerScore || 0, rating: row.seller.profile?.rating ? Number(row.seller.profile.rating) : null, ratingCount: row.seller.profile?.ratingCount || 0, verification: row.seller.verification ? { phoneVerified: row.seller.verification.phoneVerified, identityVerified: row.seller.verification.identityVerified, bankNameVerified: row.seller.verification.bankNameVerified, status: row.seller.verification.status } : null } : null };
  }
  private include() { return { paddleModel: { include: { brand: { select: { id:true, name:true, slug:true } } } }, images: true, seller: { include: { profile: true, verification: true } } } as const; }
  async listPublic(q = '', limit = 30) {
    const rows = await this.prisma.listing.findMany({ where: { status: { in: ['ACTIVE','RESERVED'] }, ...(q.trim() ? { title: { contains: q.trim().slice(0,80), mode: 'insensitive' as const } } : {}) }, include: this.include(), orderBy: { publishedAt: 'desc' }, take: Math.min(Math.max(limit,1),60) });
    return rows.map(x=>this.publicRow(x));
  }
  async getPublic(id: string) {
    const row = await this.prisma.listing.findFirst({ where: { id, status: { in: ['ACTIVE','RESERVED','SOLD'] } }, include: this.include() });
    if (!row) throw new NotFoundException('LISTING_NOT_FOUND'); return this.publicRow(row);
  }
  async createDraft(userId: string, dto: CreateListingDto) {
    if (!dto.paddleModelId && (!dto.customBrand || !dto.customModel)) throw new BadRequestException('MODEL_REQUIRED');
    const s = this.serial(dto.serialNumber);
    const row = await this.prisma.listing.create({ data: { sellerId:userId, paddleModelId:dto.paddleModelId, customBrand:dto.customBrand?.trim(), customModel:dto.customModel?.trim(), title:dto.title.trim(), description:dto.description?.trim() || '', condition:dto.condition.trim(), conditionPercent:dto.conditionPercent, priceVnd: BigInt(dto.priceVnd), province:dto.province?.trim(), district:dto.district?.trim(), serialHash:s.serialHash, serialHint:s.serialHint, invoiceAvailable:dto.invoiceAvailable, nfcAvailable:dto.nfcAvailable } });
    return { id: row.id, status: row.status, createdAt: row.createdAt };
  }
  async ownListings(userId: string) {
    const rows = await this.prisma.listing.findMany({ where:{sellerId:userId}, orderBy:{createdAt:'desc'}, take:100 });
    return rows.map(x=>({id:x.id,title:x.title,status:x.status,moderationState:x.moderationState,priceVnd:Number(x.priceVnd),createdAt:x.createdAt}));
  }
  private async ownDraft(userId:string,id:string) { const row=await this.prisma.listing.findUnique({where:{id}}); if(!row||row.sellerId!==userId) throw new NotFoundException('LISTING_NOT_FOUND'); if(row.status!=='DRAFT') throw new BadRequestException('LISTING_NOT_DRAFT'); return row; }
  async presign(userId:string,id:string,dto:PresignImageDto) { await this.ownDraft(userId,id); const count=await this.prisma.listingImage.count({where:{listingId:id}}); if(count>=8) throw new BadRequestException('MAX_8_IMAGES'); return this.storage.presign(userId,id,dto.fileName,dto.contentType,dto.size); }
  async completeImage(userId:string,id:string,dto:CompleteImageDto) { await this.ownDraft(userId,id); if(!dto.key.startsWith(`${userId}/${id}/`)) throw new ForbiddenException('IMAGE_KEY_INVALID'); await this.storage.headPrivate(dto.key); return this.prisma.listingImage.create({data:{listingId:id,privateKey:dto.key,sortOrder:dto.sortOrder},select:{id:true,sortOrder:true,moderationState:true}}); }
  async submit(userId:string,id:string) {
    const listing=await this.ownDraft(userId,id); const verification=await this.prisma.sellerVerification.findUnique({where:{userId}}); if(!verification||verification.status!=='VERIFIED'||!verification.phoneVerified||!verification.identityVerified||!verification.bankNameVerified) throw new ForbiddenException('SELLER_VERIFICATION_REQUIRED');
    const imageCount=await this.prisma.listingImage.count({where:{listingId:id}}); if(imageCount<2) throw new BadRequestException('MIN_2_IMAGES');
    await this.prisma.listing.update({where:{id:listing.id},data:{status:'PENDING_REVIEW',moderationState:'PENDING',moderationReason:null}}); return {ok:true,status:'PENDING_REVIEW'};
  }
  async markSold(userId:string,id:string) {
    const listing = await this.prisma.listing.findUnique({ where:{id}, select:{sellerId:true,status:true} });
    if (!listing || listing.sellerId !== userId) throw new NotFoundException('LISTING_NOT_FOUND');
    if (!['ACTIVE','RESERVED'].includes(listing.status)) throw new BadRequestException('LISTING_NOT_SELLABLE');
    const row = await this.prisma.listing.update({ where:{id}, data:{status:'SOLD'}, select:{id:true,status:true,updatedAt:true} });
    await this.prisma.auditLog.create({ data:{actorId:userId,event:'listing_marked_sold',entityType:'listing',entityId:id} });
    return row;
  }
  async favoriteState(userId:string,id:string) { await this.getPublic(id); return Boolean(await this.prisma.favorite.findUnique({where:{userId_listingId:{userId,listingId:id}}})); }
  async toggleFavorite(userId:string,id:string) {
    await this.getPublic(id);
    return this.prisma.$transaction(async tx => {
      const existing=await tx.favorite.findUnique({where:{userId_listingId:{userId,listingId:id}}});
      if(existing){
        await tx.favorite.delete({where:{userId_listingId:{userId,listingId:id}}});
        const current=await tx.listing.findUnique({where:{id},select:{favoriteCount:true}});
        if((current?.favoriteCount ?? 0n)>0n) await tx.listing.update({where:{id},data:{favoriteCount:{decrement:1}}});
        return {active:false};
      }
      await tx.favorite.create({data:{userId,listingId:id}});
      await tx.listing.update({where:{id},data:{favoriteCount:{increment:1}}});
      return {active:true};
    });
  }
  async report(userId:string,id:string,dto:ReportDto) { await this.getPublic(id); const allowed=['fake','scam','wrong_condition','wrong_product','prohibited','spam','other']; const reason=dto.reason.toLowerCase(); if(!allowed.includes(reason)) throw new BadRequestException('REPORT_REASON_INVALID'); const existing=await this.prisma.report.findFirst({where:{reporterId:userId,listingId:id,status:{in:['OPEN','REVIEWING']}}}); if(existing) return this.prisma.report.update({where:{id:existing.id},data:{reason,detail:dto.detail?.trim()||null},select:{id:true,status:true}}); return this.prisma.report.create({data:{reporterId:userId,listingId:id,reason,detail:dto.detail?.trim()||null},select:{id:true,status:true}}); }
}
