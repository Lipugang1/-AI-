import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 本地 getUserFromRequest，避免循环依赖
async function getLocalUser(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()');
    const db = await import('@/lib/db');
    const conn = await db.getConnection();
    const [rows]: any = await conn.execute(
      'SELECT id, username, name, role FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );
    await conn.end();
    return rows[0] || null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getLocalUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'reviewer')) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 检查 AI 配置
    const apiBase = process.env.AI_API_BASE || process.env.MIMO_API_BASE || '';
    const apiKey = process.env.AI_API_KEY || process.env.MIMO_API_KEY || '';
    if (!apiBase || !apiKey) {
      return NextResponse.json(
        { success: false, error: '未配置AI服务（缺少 AI_API_BASE / AI_API_KEY 环境变量）', code: 'NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    let period = 'month';
    let startDateStr = '';
    let endDateStr = '';
    try {
      const body = await request.json();
      period = body.period || 'month';
      startDateStr = body.startDate || '';
      endDateStr = body.endDate || '';
    } catch {}

    const allHazards: any[] = (await query('SELECT * FROM hazards ORDER BY created_at DESC')) as any[];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let hazards: any[];
    let periodLabel: string;

    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      hazards = allHazards.filter((h: any) => {
        const d = new Date(h.inspection_date || h.created_at);
        return d >= startDate && d <= endDate;
      });
      periodLabel = `${startDateStr} 至 ${endDateStr}`;
    } else {
      hazards = allHazards.filter((h: any) => {
        const d = new Date(h.inspection_date || h.created_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      periodLabel = `${currentYear}年${currentMonth + 1}月`;
    }

    // 按部门分组统计
    const deptStats: Record<string, any> = {};
    hazards.forEach((h: any) => {
      const dept = h.inspection_department || '未知部门';
      if (!deptStats[dept]) deptStats[dept] = { total: 0, hazards: [] };
      deptStats[dept].total++;
      deptStats[dept].hazards.push(h);
    });

    // 构建分析prompt
    let prompt = `# 隐患排查治理分析报告\n\n## 分析时间段：${periodLabel}\n\n`;
    prompt += `## 整体情况\n- 共发现隐患：${hazards.length}条\n`;
    prompt += `\n## 各部门情况\n`;
    for (const [dept, stats] of Object.entries(deptStats)) {
      prompt += `\n### ${dept}\n- 隐患数量：${stats.total}条\n`;
      const levelCounts: Record<string, number> = {};
      stats.hazards.forEach((h: any) => {
        const l = h.hazard_level || 'general_ii';
        levelCounts[l] = (levelCounts[l] || 0) + 1;
      });
      prompt += `- 等级分布：${JSON.stringify(levelCounts)}\n`;
    }
    prompt += `\n请根据以上数据，生成一份专业的隐患整改情况分析报告，包括整体评价、各部门问题分析、整改建议。`;

    // 使用标准 OpenAI 兼容接口调用
    const model = process.env.AI_TEXT_MODEL || 'gpt-4o-mini';
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API错误 (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    // 兼容推理模型（如MiMo-V2.5）的 reasoning_content 字段
    const msg = data.choices?.[0]?.message || {};
    const analysis = (msg.content || msg.reasoning_content || '').trim();

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        period: periodLabel,
        generatedAt: new Date().toISOString(),
        stats: { total: hazards.length, departmentCount: Object.keys(deptStats).length }
      }
    });
  } catch (error: any) {
    console.error('[Monthly Analysis] Error:', error);
    const msg = String(error.message || error || '');
    if (msg.includes('未配置') || msg.includes('API_KEY')) {
      return NextResponse.json(
        { success: false, error: msg, code: 'NOT_CONFIGURED' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, error: 'AI分析失败：' + error.message }, { status: 500 });
  }
}
