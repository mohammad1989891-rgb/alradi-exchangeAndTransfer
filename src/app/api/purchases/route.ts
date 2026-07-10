import { NextRequest, NextResponse } from 'next/server';
import {
  getPurchases,
  addPurchase,
  updatePurchase,
  deletePurchase,
} from '@/lib/supabaseDb';

// ============================================
// GET /api/purchases — list all purchases
// ============================================
export async function GET() {
  try {
    const purchases = await getPurchases();
    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب المشتريات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/purchases — create / update / delete (admin only)
// Body: { mode, userRole, ... }
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userRole } = body as { userRole?: string };

    // 🔒 RBAC
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — فقط المدير يمكنه تعديل المشتريات' },
        { status: 403 }
      );
    }

    const { mode } = body as { mode?: string };

    if (mode === 'create') {
      const { date, materialId, quantity, unitId, unitPriceUsd, description } = body as {
        date?: string;
        materialId?: string;
        quantity?: number;
        unitId?: string;
        unitPriceUsd?: number;
        description?: string;
      };
      if (!date || !materialId || !unitId || quantity === undefined || unitPriceUsd === undefined) {
        return NextResponse.json(
          { success: false, error: 'بيانات ناقصة: التاريخ، المادة، الكمية، الوحدة، السعر مطلوبة' },
          { status: 400 }
        );
      }
      if (quantity <= 0 || unitPriceUsd < 0) {
        return NextResponse.json(
          { success: false, error: 'الكمية يجب أن تكون أكبر من صفر' },
          { status: 400 }
        );
      }
      const purchase = await addPurchase({
        date,
        materialId,
        quantity,
        unitId,
        unitPriceUsd,
        description,
      });
      return NextResponse.json({ success: true, data: purchase });
    }

    if (mode === 'update') {
      const { id, date, materialId, quantity, unitId, unitPriceUsd, description } = body as {
        id?: string;
        date?: string;
        materialId?: string;
        quantity?: number;
        unitId?: string;
        unitPriceUsd?: number;
        description?: string;
      };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      const purchase = await updatePurchase(id, {
        date,
        materialId,
        quantity,
        unitId,
        unitPriceUsd,
        description,
      });
      return NextResponse.json({ success: true, data: purchase });
    }

    if (mode === 'delete') {
      const { id } = body as { id?: string };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      await deletePurchase(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'وضع غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/purchases:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
