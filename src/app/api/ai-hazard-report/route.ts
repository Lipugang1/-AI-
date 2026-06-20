import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const body = await request.json();
    const {
      summary,
      departmentStats,
      levelStats,
      statusStats,
      inspectorStats,
      monthlyTrend,
      period,
      startDate,
      endDate,
    } = body;

    if (!summary) return NextResponse.json({ success: false, error: '缺少统计数据' }, { status: 400 });

    const apiBase = process.env.AI_API_BASE || 'https://api.xiaomimimo.com/v1';
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_TEXT_MODEL || 'mimo-v2.5';

    if (!apiKey) return NextResponse.json({ success: false, error: 'AI服务未配置' }, { status: 500 });

    let timeDesc = '全部时间';
    if (startDate && endDate) timeDesc = `${startDate} 至 ${endDate}`;
    else if (period === 'month') timeDesc = '本月';

    const deptList = Object.entries(departmentStats || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, count]) => `- ${name}: ${count}条`)
      .join('\n');

    const levelList = Object.entries(levelStats || {})
      .map(([name, count]) => `- ${name}: ${count}条`)
      .join('\n');

    const statusList = Object.entries(statusStats || {})
      .map(([name, count]) => `- ${name}: ${count}条`)
      .join('\n');

    const topInspectors = (inspectorStats || []).slice(0, 5)
      .map((ins: any, i: number) => `- 第${i + 1}名：${ins.name}（${ins.department}），排查${ins.count}条`)
      .join('\n');

    const trendList = (monthlyTrend || [])
      .map((m: any) => `- ${m.month}: ${m.count}条`)
      .join('\n');

    const dataSummary = `## 隐患数据统计（${timeDesc}）

### 总体概况
- 隐患总数：${summary.total || 0} 条
- 涉及部门：${summary.departments || 0} 个
- 排查人员：${summary.inspectors || 0} 人
- 部门平均：${summary.avgPerDepartment || 0} 条
- 已关闭：${summary.closed || 0} 条
- 闭环率：${summary.closedRate || 0}%

### 部门分布
${deptList}

### 隐患等级分布
${levelList}

### 状态分布
${statusList}

### 排查人员TOP5
${topInspectors}

### 月度趋势
${trendList}`;

    const prompt = `你是一位消防安全管理专家。请基于以下隐患数据统计，生成一份专业的隐患分析报告。

要求：
1. 使用正式、专业的中文语气
2. 结构清晰，包含以下部分：
   - 总体评价（1-2句话概括当前隐患管理状况）
   - 关键发现（列出3-5条最重要的洞察，每条用 • 开头）
   - 风险提示（指出最需要关注的隐患类型或趋势）
   - 改进建议（给出3-5条具体可操作的改进建议，每条用数字序号）
   - 数据亮点（1-2句正面发现）
3. 每个部分之间用空行分隔

以下是统计数据：
${dataSummary}`;

    const resp = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位专业的消防安全管理分析专家，擅长从隐患数据中提炼关键洞察和提出改进建议。请用中文回复，格式清晰专业。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('[AI Report] API error:', JSON.stringify(data).substring(0, 200));
      return NextResponse.json({ success: false, error: data.error?.message || 'AI调用失败' }, { status: 500 });
    }

    const report = data.choices?.[0]?.message?.content || '';
    if (!report) return NextResponse.json({ success: false, error: 'AI未返回有效内容' }, { status: 500 });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('[AI Report] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '生成报告失败' }, { status: 500 });
  }
}
