import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const remittances = await db.transaction.findMany({
      where: { type: 'transfer' },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      remittances.map((r) => ({
        id: r.id,
        senderName: r.customer?.name || 'غير معروف',
        recipientName: r.recipientName || 'غير معروف',
        recipientPhone: r.recipientPhone || '',
        amount: r.amount,
        currency: r.fromCurrency,
        fee: r.fee,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.status === 'completed' ? r.updatedAt.toISOString() : undefined,
      }))
    );
  } catch (error) {
    console.error('Remittances GET error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderName, recipientName, recipientPhone, amount, currency, fee, notes, customerId } = body;

    if (!recipientName || !amount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const transaction = await db.transaction.create({
      data: {
        type: 'transfer',
        customerId: customerId || null,
        fromCurrency: currency || 'USD',
        toCurrency: currency || 'USD',
        amount: Number(amount),
        rate: 1,
        resultAmount: Number(amount),
        fee: Number(fee || 0),
        status: 'pending',
        recipientName,
        recipientPhone: recipientPhone || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, id: transaction.id });
  } catch (error) {
    console.error('Remittance POST error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
