import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

async function resolveImageToDataUri(imageInput: string): Promise<string> {
  let input = imageInput;

  // 处理 localhost/127.0.0.1 的完整URL
  if (input.startsWith('http://localhost') || input.startsWith('http://127.0.0.1') ||
      input.startsWith('https://localhost') || input.startsWith('https://127.0.0.1')) {
    try {
      const u = new URL(input);
      input = u.pathname;
    } catch { /* 保持原样 */ }
  }

  // 本地文件路径
  if (input.startsWith('/uploads/') || (input.startsWith('/') && !input.startsWith('//'))) {
    const filePath = path.join(process.cwd(), 'public', input);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
    };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  if (input.startsWith('data:')) return input;
  return imageInput;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await request.json();
    // 兼容 imageUrl 和 imageBase64 两种参数名
    const imageInput = body.imageUrl || body.imageBase64 || body.image_url || body.image_base64;
    const equipmentType = body.equipmentType || '器材';

    if (!imageInput) return NextResponse.json({ error: '未提供图片' }, { status: 400 });

    const apiBase = process.env.AI_API_BASE || 'https://api.xiaomimimo.com/v1';
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_VISION_MODEL || 'mimo-v2.5';

    if (!apiKey) return NextResponse.json({
      success: false,
      error: 'AI服务未配置API密钥',
      code: 'NOT_CONFIGURED'
    }, { status: 500 });

    // 将图片转为 base64 data URI（外部API无法访问localhost）
    const imageBase64 = await resolveImageToDataUri(imageInput);

    const resp = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageBase64, detail: 'high' }
            },
            {
              type: 'text',
              text: `你是消防器材巡查AI助手。请分析这张消防${equipmentType}巡查照片。
              
任务：
1. 判断器材状态：如果器材完好无损、在有效期内、外观正常 → "良好"；如果有损坏、过期、缺失、异常 → "异常"
2. 给出简短的AI判断结论（2-3句话，包含发现的异常或确认正常）
3. 如有异常，给出处理建议

请使用以下JSON格式回复（只输出JSON，不要其他内容）：
{
  "status": "良好"或"异常",
  "result": "AI判断结论的简短描述",
  "suggestion": "异常时的处理建议，正常时为空字符串"
}`
            }
          ],
        }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await resp.json() as any;
    if (!resp.ok) {
      const errMsg = data.error?.message || data.error || `AI调用失败 (${resp.status})`;
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    const content = data.choices?.[0]?.message?.content
      || data.choices?.[0]?.message?.reasoning_content || '';

    // 尝试解析 JSON 格式的回复
    let aiStatus = '良好';
    let aiResult = content;
    let suggestion = '';

    try {
      // 尝试提取 JSON（可能被包裹在markdown代码块中）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiStatus = parsed.status === '异常' ? '异常' : '良好';
        aiResult = parsed.result || content;
        suggestion = parsed.suggestion || '';
      }
    } catch {
      // JSON解析失败，直接用原始文本判断
      if (content.includes('异常') || content.includes('损坏') || content.includes('过期')) {
        aiStatus = '异常';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        aiResult,
        aiStatus,
        suggestion,
      }
    });
  } catch (e: any) {
    console.error('AI analyze error:', e);
    return NextResponse.json({ success: false, error: e.message || 'AI分析失败' }, { status: 500 });
  }
}
