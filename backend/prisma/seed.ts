import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const brands = [
  ['joola', 'JOOLA'],
  ['selkirk', 'Selkirk'],
  ['paddletek', 'Paddletek'],
  ['gearbox', 'Gearbox'],
  ['crbn', 'CRBN'],
  ['franklin', 'Franklin'],
  ['six-zero', 'Six Zero'],
  ['vatic-pro', 'Vatic Pro'],
  ['volair', 'Volair'],
  ['proxr', 'ProXR'],
  ['engage', 'Engage'],
  ['diadem', 'Diadem'],
  ['prokennex', 'ProKennex'],
  ['electrum', 'Electrum'],
  ['vulcan', 'Vulcan'],
  ['onix', 'ONIX'],
  ['head', 'HEAD'],
  ['wilson', 'Wilson'],
  ['babolat', 'Babolat'],
  ['gamma', 'Gamma'],
  ['adidas', 'Adidas'],
  ['ronbus', 'Ronbus'],
  ['bread-and-butter', 'Bread & Butter'],
  ['honolulu-pickleball-company', 'Honolulu Pickleball Company'],
  ['spartus', 'Spartus'],
  ['neonic', 'Neonic'],
  ['chorus', 'Chorus'],
  ['proton', 'Proton'],
  ['pickleball-apes', 'Pickleball Apes'],
  ['11six24', '11SIX24'],
  ['thrive', 'Thrive'],
  ['hudef', 'Hudef'],
  ['sypik', 'Sypik'],
  ['facolos', 'Facolos'],
  ['kamito', 'Kamito'],
  ['zocker', 'Zocker'],
  ['vnp', 'VNP'],
  ['pkv', 'PKV'],
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const [slug, name] of brands) {
      await prisma.brand.upsert({
        where: { slug },
        create: { slug, name },
        update: { name },
      });
    }

    const joola = await prisma.brand.update({
      where: { slug: 'joola' },
      data: { officialUrl: 'https://joola.com/pages/pickleball-paddles', country: 'United States' },
    });

    const verifiedAt = new Date('2026-09-12T00:00:00.000Z');
    const proIvSource = 'https://joola.com/pages/pro-iv';
    const perseusSource = 'https://joola.com/collections/pro-iv/products/joola-perseus-iv-16mm-pickleball-paddle-1';

    const models = [
      {
        slug: 'joola-perseus-pro-iv-16mm',
        name: 'Perseus Pro IV 16mm',
        generation: 'Pro IV',
        thicknessMm: 16,
        surface: 'Textured Carbon Fiber',
        core: 'PP core + EVA foam wall',
        shape: 'Elongated',
        averageWeightOz: 8.1,
        lengthIn: 16.5,
        widthIn: 7.5,
        gripLengthIn: 5.5,
        gripCircumferenceIn: 4.25,
        approval: 'UPA-A; USAP PBCoR .43',
        nfc: true,
        sourceUrl: perseusSource,
        verifiedAt,
      },
      { slug: 'joola-perseus-pro-iv-14mm', name: 'Perseus Pro IV 14mm', generation: 'Pro IV', thicknessMm: 14, shape: 'Elongated', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-hyperion-pro-iv-16mm', name: 'Hyperion Pro IV 16mm', generation: 'Pro IV', thicknessMm: 16, shape: 'Elongated', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-hyperion-pro-iv-14mm', name: 'Hyperion Pro IV 14mm', generation: 'Pro IV', thicknessMm: 14, shape: 'Elongated', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-scorpeus-pro-iv-16mm', name: 'Scorpeus Pro IV 16mm', generation: 'Pro IV', thicknessMm: 16, shape: 'Wide-body', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-scorpeus-pro-iv-14mm', name: 'Scorpeus Pro IV 14mm', generation: 'Pro IV', thicknessMm: 14, shape: 'Wide-body', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-agassi-pro-iv-16mm', name: 'Agassi Pro IV 16mm', generation: 'Pro IV', thicknessMm: 16, shape: 'Racket', sourceUrl: proIvSource, verifiedAt },
      { slug: 'joola-agassi-pro-iv-14mm', name: 'Agassi Pro IV 14mm', generation: 'Pro IV', thicknessMm: 14, shape: 'Racket', sourceUrl: proIvSource, verifiedAt },
    ] as const;

    for (const model of models) {
      await prisma.paddleModel.upsert({
        where: { slug: model.slug },
        create: { brandId: joola.id, ...model },
        update: { brandId: joola.id, ...model },
      });
    }

    console.log(`Seeded ${brands.length} brands and ${models.length} verified model variants.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
