import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { buyRate, sellRate } = body;

    const rate = await db.exchangeRate.update({
      where: { id },
      data: {
        ...(buyRate !== undefined && { buyRate: Number(buyRate) }),
        ...(sellRate !== undefined && { sellRate: Number(sellRate) }),
      },
    });

    return NextResponse.json({ success: true, rate });
  } catch (error) {
    console.error('Exchange rate PUT error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.exchangeRate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange rate DELETE error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
