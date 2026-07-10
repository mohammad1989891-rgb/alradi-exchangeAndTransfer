import { NextRequest, NextResponse } from 'next/server';
import {
  getSales,
  getSalesByAccount,
  addSale,
  updateSale,
  deleteSale,
} from '@/lib/supabaseDb';

// ============================================
// GET /api/sales — list all sales OR sales by account
// ?accountId=xxx → returns sales for that account
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (accountId) {
      const sales = await getSalesByAccount(accountId);
      return NextResponse.json({ success: true, data: sales });
    }

    const sales = await getSales();
    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب المبيعات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/sales — create / update / delete (admin only)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userRole } = body as { userRole?: string };

    // 🔒 RBAC
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — فقط المدير يمكنه تعديل المبيعات' },
        { status: 403 }
      );
    }

    const { mode } = body as { mode?: string };

    if (mode === 'create') {
      const { date, accountId, materialId, quantity, unitId, unitPrice, paymentMethod, description } = body as {
        date?: string;
        accountId?: string;
        materialId?: string;
        quantity?: number;
        unitId?: string;
        unitPrice?: number;
        paymentMethod?: 'cash' | 'credit';
        description?: string;
      };
      if (!date || !accountId || !materialId || !unitId || quantity === undefined || unitPrice === undefined) {
        return NextResponse.json(
          { success: false, error: 'بيانات ناقصة' },
          { status: 400 }
        );
      }
      if (quantity <= 0 || unitPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'الكمية والسعر يجب أن يكونا أكبر من صفر' },
          { status: 400 }
        );
      }
      const sale = await addSale({
        date,
        accountId,
        materialId,
        quantity,
        unitId,
        unitPrice,
        paymentMethod,
        description,
      });
      return NextResponse.json({ success: true, data: sale });
    }

    if (mode === 'update') {
      const { id, date, accountId, materialId, quantity, unitId, unitPrice, paymentMethod, description } = body as {
        id?: string;
        date?: string;
        accountId?: string;
        materialId?: string;
        quantity?: number;
        unitId?: string;
        unitPrice?: number;
        paymentMethod?: 'cash' | 'credit';
        description?: string;
      };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      const sale = await updateSale(id, {
        date,
        accountId,
        materialId,
        quantity,
        unitId,
        unitPrice,
        paymentMethod,
        description,
      });
      return NextResponse.json({ success: true, data: sale });
    }

    if (mode === 'delete') {
      const { id } = body as { id?: string };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      await deleteSale(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'وضع غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/sales:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
