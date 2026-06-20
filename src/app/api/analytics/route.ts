import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // 加载所有原始数据
    const allHazards = await query('SELECT * FROM hazards ORDER BY created_at DESC') as any[];
    const allInspections = await query('SELECT ir.*, fe.type as equipment_type, fe.code as equipment_code, fe.warehouse_id, w.name as warehouse_name FROM inspection_records ir LEFT JOIN fire_equipment fe ON ir.equipment_id = fe.id LEFT JOIN warehouses w ON fe.warehouse_id = w.id ORDER BY ir.inspection_time DESC') as any[];
    const allMonthlyChecks = await query('SELECT msc.*, w.name as warehouse_name FROM monthly_safety_checks msc LEFT JOIN warehouses w ON msc.warehouse_id = w.id ORDER BY msc.check_date DESC') as any[];
    const allMeetings = await query('SELECT m.*, t.name as team_name, d.name as department_name FROM meetings m LEFT JOIN teams t ON m.team_id = t.id LEFT JOIN departments d ON m.department_id = d.id ORDER BY m.date DESC') as any[];
    const allParticipants = await query('SELECT p.* FROM participants p ORDER BY p.created_at DESC') as any[];
    const allEquipment = await query('SELECT * FROM fire_equipment') as any[];
    const allAreas = await query('SELECT * FROM areas') as any[];

    // 时间筛选辅助函数
    const isInRange = (dateStr: string | Date, start: Date, end: Date) => {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };
    const isThisMonth = (dateStr: string | Date) => {
      const now = new Date();
      const d = new Date(dateStr);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };
    const createFilter = () => {
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        return (d: string | Date) => isInRange(d, start, end);
      }
      if (period === 'month') return isThisMonth;
      return () => true;
    };

    const filterFn = createFilter();
    const filterFnForCreatedAt = createFilter(); // inspection_records use inspection_time, hazards use inspection_date

    // ==================== 隐患数据分析 ====================
    let hazards = allHazards;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      hazards = allHazards.filter((h: any) => isInRange(h.inspection_date || h.created_at, start, end));
    } else if (period === 'month') {
      hazards = allHazards.filter((h: any) => isThisMonth(h.inspection_date || h.created_at));
    }

    // 1. 各部门隐患数量统计
    const departmentStats: Record<string, number> = {};
    hazards.forEach((h: any) => {
      const dept = h.inspection_department || '未知部门';
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });

    // 2. 隐患等级分布
    const levelStats: Record<string, number> = {};
    hazards.forEach((h: any) => {
      const level = h.hazard_level || 'general_ii';
      const levelName = level === 'general_i' ? '一般隐患I级'
        : level === 'general_ii' ? '一般隐患II级'
        : level === 'serious_i' ? '重大隐患I级'
        : '重大隐患II级';
      levelStats[levelName] = (levelStats[levelName] || 0) + 1;
    });

    // 3. 隐患状态分布（含闭环率）
    const statusStats: Record<string, number> = {};
    hazards.forEach((h: any) => {
      const s = h.status || 'draft';
      const sName = s === 'draft' ? '草稿'
        : s === 'submitted' ? '已上报'
        : s === 'approved' ? '审核通过'
        : s === 'rejected' ? '已驳回'
        : s === 'governance' || s === 'processing' ? '治理中'
        : s === 'closed' ? '已关闭' : s;
      statusStats[sName] = (statusStats[sName] || 0) + 1;
    });

    // 4. 排查人员统计
    const inspectorStats: Record<string, { name: string; department: string; count: number }> = {};
    hazards.forEach((h: any) => {
      const name = h.inspector_name || h.inspector || '未知';
      if (!inspectorStats[name]) {
        inspectorStats[name] = { name, department: h.inspection_department || '', count: 0 };
      }
      inspectorStats[name].count++;
    });

    // 5. 月度趋势（最近6个月）
    const monthlyTrend: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = 0;
    }
    allHazards.forEach((h: any) => {
      const d = new Date(h.inspection_date || h.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrend.hasOwnProperty(key)) monthlyTrend[key]++;
    });

    const hazardSummary = {
      total: hazards.length,
      departments: Object.keys(departmentStats).length,
      inspectors: Object.keys(inspectorStats).length,
      avgPerDepartment: Object.keys(departmentStats).length > 0
        ? Math.round(hazards.length / Object.keys(departmentStats).length)
        : 0,
      closed: statusStats['已关闭'] || 0,
      closedRate: hazards.length > 0 ? Math.round((statusStats['已关闭'] || 0) / hazards.length * 100) : 0,
    };

    // ==================== 器材巡查统计 ====================
    let inspections = allInspections;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      inspections = allInspections.filter((ir: any) => isInRange(ir.inspection_time, start, end));
    } else if (period === 'month') {
      inspections = allInspections.filter((ir: any) => isThisMonth(ir.inspection_time));
    }

    // 器材类型分布
    const equipmentTypeStats: Record<string, number> = {};
    inspections.forEach((ir: any) => {
      const type = ir.equipment_type || '未知';
      equipmentTypeStats[type] = (equipmentTypeStats[type] || 0) + 1;
    });

    // 异常率
    const anomalyCount = inspections.filter((ir: any) => ir.status === '异常').length;
    const anomalyRate = inspections.length > 0 ? Math.round(anomalyCount / inspections.length * 100) : 0;
    const normalCount = inspections.length - anomalyCount;

    // 巡查人员统计
    const eqInspectorStats: Record<string, { name: string; count: number; anomalyCount: number }> = {};
    inspections.forEach((ir: any) => {
      const name = ir.inspector_name || '未知';
      if (!eqInspectorStats[name]) {
        eqInspectorStats[name] = { name, count: 0, anomalyCount: 0 };
      }
      eqInspectorStats[name].count++;
      if (ir.status === '异常') eqInspectorStats[name].anomalyCount++;
    });

    // 器材巡查月度趋势
    const eqMonthlyTrend: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      eqMonthlyTrend[key] = 0;
    }
    allInspections.forEach((ir: any) => {
      const d = new Date(ir.inspection_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (eqMonthlyTrend.hasOwnProperty(key)) eqMonthlyTrend[key]++;
    });

    const equipmentSummary = {
      totalInspections: inspections.length,
      totalEquipment: allEquipment.length,
      anomalyRate,
      anomalyCount,
      normalCount,
      totalInspectors: Object.keys(eqInspectorStats).length,
    };

    // ==================== 月度安全检查统计 ====================
    let monthlyChecks = allMonthlyChecks;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      monthlyChecks = allMonthlyChecks.filter((mc: any) => isInRange(mc.check_date, start, end));
    } else if (period === 'month') {
      monthlyChecks = allMonthlyChecks.filter((mc: any) => isThisMonth(mc.check_date));
    }

    // 区域检查覆盖率
    const checkedAreas = new Set(monthlyChecks.map((mc: any) => mc.area_id || mc.warehouse_id).filter(Boolean));
    const areaCoverageRate = allAreas.length > 0 ? Math.round(checkedAreas.size / allAreas.length * 100) : 0;

    // 合格率
    const qualifiedChecks = monthlyChecks.filter((mc: any) => mc.overall_conclusion === '合格').length;
    const qualifiedRate = monthlyChecks.length > 0 ? Math.round(qualifiedChecks / monthlyChecks.length * 100) : 0;

    // 月度安全检查趋势
    const mcMonthlyTrend: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mcMonthlyTrend[key] = 0;
    }
    allMonthlyChecks.forEach((mc: any) => {
      const d = new Date(mc.check_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (mcMonthlyTrend.hasOwnProperty(key)) mcMonthlyTrend[key]++;
    });

    const monthlyCheckSummary = {
      totalChecks: monthlyChecks.length,
      totalAreas: allAreas.length,
      areaCoverageRate,
      qualifiedChecks,
      unqualifiedChecks: monthlyChecks.length - qualifiedChecks,
      qualifiedRate,
    };

    // ==================== 晨会统计 ====================
    let meetings = allMeetings;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      meetings = allMeetings.filter((m: any) => isInRange(m.date, start, end));
    } else if (period === 'month') {
      meetings = allMeetings.filter((m: any) => isThisMonth(m.date));
    }

    // 部门覆盖
    const meetingDepts = new Set(meetings.map((m: any) => m.department_id || m.department_name).filter(Boolean));

    // 出勤统计
    const meetingIds = meetings.map((m: any) => m.id);
    const relevantParticipants = allParticipants.filter((p: any) => meetingIds.includes(p.meeting_id));
    const totalAttendance = relevantParticipants.length;
    const presentCount = relevantParticipants.filter((p: any) => p.attendance_status === 'present').length;
    const attendanceRate = totalAttendance > 0 ? Math.round(presentCount / totalAttendance * 100) : 0;

    // 晨会月度趋势
    const meetingMonthlyTrend: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meetingMonthlyTrend[key] = 0;
    }
    allMeetings.forEach((m: any) => {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (meetingMonthlyTrend.hasOwnProperty(key)) meetingMonthlyTrend[key]++;
    });

    const meetingSummary = {
      totalMeetings: meetings.length,
      departmentsCovered: meetingDepts.size,
      totalAttendance,
      presentCount,
      absentCount: totalAttendance - presentCount,
      attendanceRate,
    };

    return NextResponse.json({
      success: true,
      data: {
        // 隐患
        hazard: {
          summary: hazardSummary,
          departmentStats,
          levelStats,
          statusStats,
          inspectorStats: Object.values(inspectorStats).sort((a: any, b: any) => b.count - a.count),
          monthlyTrend: Object.entries(monthlyTrend).map(([month, count]) => ({ month, count })),
        },
        // 器材巡查
        equipment: {
          summary: equipmentSummary,
          equipmentTypeStats,
          eqInspectorStats: Object.values(eqInspectorStats).sort((a: any, b: any) => b.count - a.count),
          monthlyTrend: Object.entries(eqMonthlyTrend).map(([month, count]) => ({ month, count })),
        },
        // 月度检查
        monthlyCheck: {
          summary: monthlyCheckSummary,
          monthlyTrend: Object.entries(mcMonthlyTrend).map(([month, count]) => ({ month, count })),
        },
        // 晨会
        meeting: {
          summary: meetingSummary,
          monthlyTrend: Object.entries(meetingMonthlyTrend).map(([month, count]) => ({ month, count })),
        },
      }
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ success: false, error: '获取分析数据失败' }, { status: 500 });
  }
}

async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()');
    const conn = await (await import('@/lib/db')).getConnection();
    const [rows]: any = await conn.execute(
      'SELECT id, username, name, role FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );
    await conn.end();
    return rows[0] || null;
  } catch {
    return null;
  }
}
