import { NextRequest, NextResponse } from 'next/server';
import {
  getMaterials,
  getMaterialById,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addMaterialUnit,
  updateMaterialUnit,
  deleteMaterialUnit,
  getAllMaterialInventories,
} from '@/lib/supabaseDb';

// ============================================
// GET /api/materials — list materials (+ optional inventory)
// ?withInventory=true → returns MaterialInventory[]
// ?id=xxx → returns single material
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withInventory = searchParams.get('withInventory') === 'true';
    const id = searchParams.get('id');

    if (id) {
      const material = await getMaterialById(id);
      return NextResponse.json({ success: true, data: material });
    }

    if (withInventory) {
      const inventories = await getAllMaterialInventories();
      return NextResponse.json({ success: true, data: inventories });
    }

    const materials = await getMaterials();
    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب المواد' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/materials — create / update / delete material (admin only)
// Also handles material_units sub-operations
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userRole } = body as { userRole?: string };

    // 🔒 RBAC
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — فقط المدير يمكنه تعديل المواد' },
        { status: 403 }
      );
    }

    const { mode } = body as { mode?: string };

    if (mode === 'create') {
      const { name, defaultUnitId, units } = body as {
        name?: string;
        defaultUnitId?: string;
        units?: { unitId: string; baseFactor: number }[];
      };
      if (!name || !defaultUnitId) {
        return NextResponse.json(
          { success: false, error: 'اسم المادة والوحدة الافتراضية مطلوبان' },
          { status: 400 }
        );
      }
      const material = await addMaterial({ name, defaultUnitId, units });
      return NextResponse.json({ success: true, data: material });
    }

    if (mode === 'update') {
      const { id, name, defaultUnitId } = body as {
        id?: string;
        name?: string;
        defaultUnitId?: string;
      };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      const material = await updateMaterial(id, { name, defaultUnitId });
      return NextResponse.json({ success: true, data: material });
    }

    if (mode === 'delete') {
      const { id } = body as { id?: string };
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      await deleteMaterial(id);
      return NextResponse.json({ success: true });
    }

    // ---- Material Units sub-operations ----
    if (mode === 'add-unit') {
      const { materialId, unitId, baseFactor } = body as {
        materialId?: string;
        unitId?: string;
        baseFactor?: number;
      };
      if (!materialId || !unitId) {
        return NextResponse.json(
          { success: false, error: 'المادة والوحدة مطلوبان' },
          { status: 400 }
        );
      }
      const mu = await addMaterialUnit({ materialId, unitId, baseFactor: baseFactor || 1 });
      return NextResponse.json({ success: true, data: mu });
    }

    if (mode === 'update-unit') {
      const { muId, baseFactor } = body as { muId?: string; baseFactor?: number };
      if (!muId || baseFactor === undefined) {
        return NextResponse.json(
          { success: false, error: 'المعرف ومعامل التحويل مطلوبان' },
          { status: 400 }
        );
      }
      await updateMaterialUnit(muId, baseFactor);
      return NextResponse.json({ success: true });
    }

    if (mode === 'delete-unit') {
      const { muId } = body as { muId?: string };
      if (!muId) {
        return NextResponse.json(
          { success: false, error: 'المعرف مطلوب' },
          { status: 400 }
        );
      }
      await deleteMaterialUnit(muId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'وضع غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/materials:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
