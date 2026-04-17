import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Seed currencies
    const currencies = [
      { code: 'SYP', nameAr: 'ليرة سورية', nameEn: 'Syrian Pound', symbol: 'ل.س', flag: '🇸🇾' },
      { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', flag: '🇺🇸' },
      { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€', flag: '🇪🇺' },
      { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£', flag: '🇬🇧' },
      { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
      { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
      { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
      { code: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ', flag: '🇯🇴' },
      { code: 'LBP', nameAr: 'ليرة لبنانية', nameEn: 'Lebanese Pound', symbol: 'ل.ل', flag: '🇱🇧' },
    ];

    for (const currency of currencies) {
      await db.currency.upsert({
        where: { code: currency.code },
        update: currency,
        create: currency,
      });
    }

    // Seed exchange rates
    const exchangeRates = [
      { fromCurrency: 'USD', toCurrency: 'SYP', buyRate: 14500, sellRate: 14700, isActive: true },
      { fromCurrency: 'EUR', toCurrency: 'SYP', buyRate: 15700, sellRate: 15900, isActive: true },
      { fromCurrency: 'GBP', toCurrency: 'SYP', buyRate: 18300, sellRate: 18600, isActive: true },
      { fromCurrency: 'SAR', toCurrency: 'SYP', buyRate: 3860, sellRate: 3920, isActive: true },
      { fromCurrency: 'AED', toCurrency: 'SYP', buyRate: 3940, sellRate: 4000, isActive: true },
      { fromCurrency: 'TRY', toCurrency: 'SYP', buyRate: 400, sellRate: 415, isActive: true },
      { fromCurrency: 'JOD', toCurrency: 'SYP', buyRate: 20400, sellRate: 20700, isActive: true },
      { fromCurrency: 'LBP', toCurrency: 'SYP', buyRate: 0.16, sellRate: 0.18, isActive: true },
      { fromCurrency: 'USD', toCurrency: 'EUR', buyRate: 0.92, sellRate: 0.94, isActive: true },
      { fromCurrency: 'USD', toCurrency: 'GBP', buyRate: 0.79, sellRate: 0.81, isActive: true },
      { fromCurrency: 'USD', toCurrency: 'SAR', buyRate: 3.75, sellRate: 3.76, isActive: true },
      { fromCurrency: 'USD', toCurrency: 'AED', buyRate: 3.67, sellRate: 3.68, isActive: true },
    ];

    for (const rate of exchangeRates) {
      const existing = await db.exchangeRate.findFirst({
        where: { fromCurrency: rate.fromCurrency, toCurrency: rate.toCurrency },
      });
      if (existing) {
        await db.exchangeRate.update({ where: { id: existing.id }, data: rate });
      } else {
        await db.exchangeRate.create({ data: rate });
      }
    }

    // Seed customers
    const customers = [
      { name: 'أحمد محمد', phone: '+963-911-234-567', idNumber: '12345678', address: 'دمشق - المزة', notes: 'عميل VIP' },
      { name: 'خالد علي', phone: '+963-933-456-789', idNumber: '23456789', address: 'حلب - السليمانية', notes: '' },
      { name: 'فاطمة حسن', phone: '+963-944-567-890', idNumber: '34567890', address: 'حمص - الوعر', notes: 'تتعامل باليورو غالباً' },
      { name: 'عمر يوسف', phone: '+963-955-678-901', idNumber: '45678901', address: 'اللاذقية - الزراعة', notes: '' },
      { name: 'سارة أحمد', phone: '+963-966-789-012', idNumber: '56789012', address: 'طرطوس - المينا', notes: '' },
      { name: 'نور الدين', phone: '+963-977-890-123', idNumber: '67890123', address: 'دمشق - كفرسوسة', notes: 'عميل منتظم' },
      { name: 'ليلى كرم', phone: '+963-988-901-234', idNumber: '78901234', address: 'حماة - الحضارة', notes: '' },
      { name: 'رامي العلي', phone: '+963-999-012-345', idNumber: '89012345', address: 'دير الزور - القوسور', notes: '' },
    ];

    const createdCustomers = [];
    for (const customer of customers) {
      const existing = await db.customer.findFirst({
        where: { idNumber: customer.idNumber },
      });
      if (existing) {
        createdCustomers.push(existing);
      } else {
        const created = await db.customer.create({ data: customer });
        createdCustomers.push(created);
      }
    }

    // Seed transactions
    const transactions = [
      { type: 'exchange', customerId: createdCustomers[0]?.id, fromCurrency: 'USD', toCurrency: 'SYP', amount: 1000, rate: 14500, resultAmount: 14500000, fee: 5000, status: 'completed' },
      { type: 'transfer', customerId: createdCustomers[1]?.id, fromCurrency: 'USD', toCurrency: 'USD', amount: 500, rate: 1, resultAmount: 500, fee: 10, status: 'pending', recipientName: 'سعاد علي', recipientPhone: '+963-911-123-456', notes: 'حوالة عائلية' },
      { type: 'exchange', customerId: createdCustomers[2]?.id, fromCurrency: 'EUR', toCurrency: 'SYP', amount: 500, rate: 15700, resultAmount: 7850000, fee: 4000, status: 'completed' },
      { type: 'exchange', customerId: createdCustomers[3]?.id, fromCurrency: 'SAR', toCurrency: 'SYP', amount: 3000, rate: 3860, resultAmount: 11580000, fee: 3000, status: 'completed' },
      { type: 'transfer', customerId: createdCustomers[4]?.id, fromCurrency: 'USD', toCurrency: 'USD', amount: 2000, rate: 1, resultAmount: 2000, fee: 15, status: 'cancelled', recipientName: 'محمد أحمد', notes: 'تم الإلغاء' },
      { type: 'exchange', customerId: createdCustomers[5]?.id, fromCurrency: 'GBP', toCurrency: 'SYP', amount: 200, rate: 18300, resultAmount: 3660000, fee: 2500, status: 'completed' },
      { type: 'exchange', customerId: createdCustomers[6]?.id, fromCurrency: 'USD', toCurrency: 'SYP', amount: 5000, rate: 14500, resultAmount: 72500000, fee: 0, status: 'completed' },
      { type: 'exchange', customerId: createdCustomers[7]?.id, fromCurrency: 'AED', toCurrency: 'SYP', amount: 5000, rate: 3940, resultAmount: 19700000, fee: 6000, status: 'completed' },
      { type: 'transfer', customerId: createdCustomers[0]?.id, fromCurrency: 'EUR', toCurrency: 'EUR', amount: 1000, rate: 1, resultAmount: 1000, fee: 12, status: 'pending', recipientName: 'عبدالله سالم', recipientPhone: '+963-933-789-012' },
      { type: 'exchange', customerId: createdCustomers[1]?.id, fromCurrency: 'TRY', toCurrency: 'SYP', amount: 10000, rate: 400, resultAmount: 4000000, fee: 2000, status: 'completed' },
    ];

    for (const tx of transactions) {
      await db.transaction.create({ data: tx });
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
