import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await request.json();
    const { imageBase64, equipmentType } = body;

    if (!imageBase64) return NextResponse.json({ error: '未提供图片' }, { status: 400 });

    const apiBase = process.env.AI_API_BASE || 'https://api.xiaomimimo.com/v1';
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_VISION_MODEL || 'mimo-v2.5';

    if (!apiKey) return NextResponse.json({ error: 'AI未配置' }, { status: 500 });

    const resp = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `分析这张消防${equipmentType || '器材'}巡查照片，判断器材状态是否正常。如发现异常请简要说明。` },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        }],
        max_tokens: 500,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: data.error?.message || 'AI调用失败' }, { status: 500 });

    const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    return NextResponse.json({ result });
  } catch (e: any) {
    console.error('AI analyze error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
