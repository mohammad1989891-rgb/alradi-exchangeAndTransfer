import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCurrencies = [
  { code: 'USD', name: 'دولار أمريكي', symbol: '$', isDefault: true },
  { code: 'SYP', name: 'ليرة سورية', symbol: 'ل.س', isDefault: false },
  { code: 'JOD', name: 'دينار أردني', symbol: 'د.أ', isDefault: false },
  { code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك', isDefault: false },
  { code: 'EUR', name: 'يورو', symbol: '€', isDefault: false },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', isDefault: false },
  { code: 'QAR', name: 'ريال قطري', symbol: 'ر.ق', isDefault: false },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ', isDefault: false },
  { code: 'BHD', name: 'دينار بحريني', symbol: 'د.ب', isDefault: false },
  { code: 'GBP', name: 'جنيه استرليني', symbol: '£', isDefault: false },
];

async function main() {
  console.log('Seeding database...');
  
  // Create currencies
  for (const currency of defaultCurrencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
  
  console.log('Currencies seeded successfully!');
  
  // Create vaults for each currency
  const currencies = await prisma.currency.findMany();
  for (const currency of currencies) {
    await prisma.vault.upsert({
      where: { currencyId: currency.id },
      update: {},
      create: { currencyId: currency.id, balance: 0 },
    });
  }
  
  console.log('Vaults seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
