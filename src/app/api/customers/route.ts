import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { idNumber: { contains: search } },
      ];
    }

    const customers = await db.customer.findMany({
      where,
      include: {
        _count: { select: { transactions: true } },
        transactions: {
          select: { amount: true, resultAmount: true },
          where: { status: 'completed' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        idNumber: c.idNumber || '',
        address: c.address || '',
        notes: c.notes || '',
        totalTransactions: c._count.transactions,
        totalAmount: c.transactions.reduce((sum, t) => sum + t.resultAmount, 0),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Customers GET error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, idNumber, address, notes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone: phone || null,
        idNumber: idNumber || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, id: customer.id });
  } catch (error) {
    console.error('Customer POST error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
