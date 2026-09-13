import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const brandCount = await prisma.brand.count();
    if (brandCount < 38) throw new Error(`CATALOG_BRAND_COUNT_LOW:${brandCount}`);

    const joola = await prisma.brand.findUnique({
      where: { slug: 'joola' },
      include: { models: true },
    });
    if (!joola || joola.models.length < 8) throw new Error('CATALOG_JOOLA_MODELS_MISSING');

    const perseus = await prisma.paddleModel.findUnique({ where: { slug: 'joola-perseus-pro-iv-16mm' } });
    if (!perseus) throw new Error('CATALOG_VERIFIED_MODEL_MISSING');
    if (Number(perseus.thicknessMm) !== 16) throw new Error('CATALOG_THICKNESS_INVALID');
    if (!perseus.sourceUrl?.startsWith('https://joola.com/')) throw new Error('CATALOG_SOURCE_INVALID');
    if (!perseus.verifiedAt) throw new Error('CATALOG_VERIFIED_AT_MISSING');

    console.log(`Catalog check PASS: ${brandCount} brands, ${joola.models.length} JOOLA model variants.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
