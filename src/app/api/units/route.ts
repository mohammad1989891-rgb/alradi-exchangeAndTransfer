import { NextRequest, NextResponse } from 'next/server';
import {
  getUnits,
  addUnit,
  updateUnit,
  deleteUnit,
} from '@/lib/supabaseDb';

// ============================================
// GET /api/units — list all units
// ============================================
export async function GET() {
  try {
    const units = await getUnits();
    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب الوحدات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/units — create / update / delete a unit (admin only)
// Body: { mode: 'create' | 'update' | 'delete', name?, id?, userRole }
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, name, id, userRole } = body as {
      mode?: 'create' | 'update' | 'delete';
      name?: string;
      id?: string;
      userRole?: string;
    };

    // 🔒 RBAC: only admins can modify units
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — فقط المدير يمكنه تعديل الوحدات' },
        { status: 403 }
      );
    }

    if (mode === 'create') {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'اسم الوحدة مطلوب' },
          { status: 400 }
        );
      }
      const unit = await addUnit(name.trim());
      return NextResponse.json({ success: true, data: unit });
    }

    if (mode === 'update') {
      if (!id || !name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'المعرف والاسم مطلوبان' },
          { status: 400 }
        );
      }
      const unit = await updateUnit(id, name.trim());
      return NextResponse.json({ success: true, data: unit });
    }

    if (mode === 'delete') {
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      await deleteUnit(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'وضع غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/units:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
