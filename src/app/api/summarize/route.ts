import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, participantNames } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: '请提供会议记录文本' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一个专业的会议记录助手，负责整理和总结晨会内容。
请按照以下格式输出会议总结，每部分内容要简洁明了：

- 日期：以当前实际日期为准
- 会前点名：人员到岗情况及与会人员状态
- 安排部署工作任务：今日的工作任务
- 教育培训：培训内容
- 抽问情况：抽问问题、抽问人员和回答情况
- 强调当班安全生产注意事项：安全注意事项
- 总结：用简短语句概括晨会核心要点

注意事项：
1. 如果会议记录中没有提到某个部分，可以写"无"或简单说明
2. 总结要准确、客观，不要添加会议中未提及的内容
3. 使用专业的语言风格`;

    const userPrompt = `以下是晨会的语音识别记录，参会人员包括：${participantNames?.join('、') || '未提供'}

会议记录：
${transcript}

请按照指定格式总结会议内容。`;

    const apiBase = process.env.AI_API_BASE || 'https://api.xiaomimimo.com/v1';
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_TEXT_MODEL || 'mimo-v2.5';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI服务未配置，请设置AI_API_KEY环境变量' },
        { status: 500 }
      );
    }

    const resp = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Summarize API error:', data);
      return NextResponse.json({ error: data.error?.message || 'AI调用失败', summary: '' }, { status: 500 });
    }

    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';

    return NextResponse.json({ summary: content });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI总结失败' },
      { status: 500 }
    );
  }
}
