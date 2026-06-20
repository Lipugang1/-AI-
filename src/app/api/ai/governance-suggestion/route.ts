import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

async function callAI(prompt: string, systemPrompt: string, model?: string): Promise<string> {
  const apiBase = process.env.AI_API_BASE || process.env.MIMO_API_BASE || '';
  const apiKey = process.env.AI_API_KEY || process.env.MIMO_API_KEY || '';
  const useModel = model || process.env.AI_TEXT_MODEL || 'gpt-4o-mini';

  if (!apiBase || !apiKey) {
    throw new Error('未配置AI服务（缺少 AI_API_BASE / AI_API_KEY 环境变量）');
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: useModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API错误 (${response.status}): ${errText}`);
  }

  const data = await response.json() as any;
  // 兼容推理模型（如MiMo-V2.5）的 reasoning_content 字段
  const msg = data.choices?.[0]?.message || {};
  return (msg.content || msg.reasoning_content || '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { hazard_description, current_measure, hazard_level, hazard_category, type, governance_measure } = body;

    if (!hazard_description && type !== 'governance_details') {
      return NextResponse.json({ success: false, error: '请提供隐患描述' }, { status: 400 });
    }

    const levelText = hazard_level === 'general_i' ? '一般隐患I级'
      : hazard_level === 'general_ii' ? '一般隐患II级' : '';
    const categoryText = hazard_category || '';

    let result: string;

    if (type === 'governance_details') {
      // 生成治理情况描述
      result = await callAI(
        `隐患描述：${hazard_description || ''}${levelText ? `\n隐患等级：${levelText}` : ''}${categoryText ? `\n隐患分类：${categoryText}` : ''}\n治理措施：${governance_measure}\n\n请根据以上治理措施，生成具体治理情况描述。`,
        `你是城市轨道交通安全隐患治理专家。根据治理措施，生成具体的治理情况描述。\n\n## 输出格式\n以"已整改，"开头，然后描述具体治理执行情况。\n\n## 要求\n1. 描述应体现治理措施已实际执行的过程和结果\n2. 内容具体、真实，包含关键执行细节\n3. 使用简洁规范的书面语言\n4. 总字数控制在100字以内\n5. 只输出治理情况文本，不要任何前缀标签`
      );
    } else {
      // 生成治理措施建议
      result = await callAI(
        current_measure
          ? `隐患描述：${hazard_description}${levelText ? `\n隐患等级：${levelText}` : ''}${categoryText ? `\n隐患分类：${categoryText}` : ''}\n\n当前治理措施：${current_measure}\n\n请基于以上隐患信息，优化治理措施。`
          : `隐患描述：${hazard_description}${levelText ? `\n隐患等级：${levelText}` : ''}${categoryText ? `\n隐患分类：${categoryText}` : ''}\n\n请基于以上隐患信息，生成治理措施。`,
        `你是城市轨道交通安全隐患治理专家。根据隐患描述，生成专业、具体、可操作的治理措施。

## 治理措施要求
1. 措施必须具体可执行，明确责任人/部门、完成标准和时限要求
2. 先写立即采取的管控措施，再写限期完成的根治措施，连贯成一段话
3. 针对隐患根因制定根治措施，而非仅临时处理
4. 符合城市轨道交通运营安全管理规范
5. 使用简洁规范的书面语言

## 输出格式
直接输出治理措施文本，不要分段标题，不要编号前缀，不要验收标准。
将管控措施和根治措施写成一段连贯的文字即可。

保持内容简洁实用，总字数控制在150字以内。`
      );
    }

    if (!result || result.length < 5) {
      return NextResponse.json({ success: false, error: 'AI生成建议为空，请重试' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { suggestion: result } });
  } catch (error: any) {
    console.error('Governance suggestion error:', error);
    const msg = String(error.message || error || '');
    if (msg.includes('未配置') || msg.includes('API_KEY')) {
      return NextResponse.json(
        { success: false, error: msg, code: 'NOT_CONFIGURED' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || '生成治理措施建议失败' },
      { status: 500 }
    );
  }
}
