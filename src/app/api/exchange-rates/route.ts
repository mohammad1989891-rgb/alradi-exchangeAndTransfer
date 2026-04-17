import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rates = await db.exchangeRate.findMany({
      where: { isActive: true },
      orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }],
    });

    return NextResponse.json(
      rates.map((r) => ({
        id: r.id,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        buyRate: r.buyRate,
        sellRate: r.sellRate,
        lastUpdated: r.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Exchange rates GET error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromCurrency, toCurrency, buyRate, sellRate } = body;

    if (!fromCurrency || !toCurrency || buyRate === undefined || sellRate === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const rate = await db.exchangeRate.create({
      data: { fromCurrency, toCurrency, buyRate: Number(buyRate), sellRate: Number(sellRate), isActive: true },
    });

    return NextResponse.json({ success: true, id: rate.id });
  } catch (error) {
    console.error('Exchange rates POST error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
