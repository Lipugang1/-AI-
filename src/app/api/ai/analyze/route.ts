import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

function getCurrentDate(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日`;
}

/**
 * 将图片输入统一转换为 base64 data URI
 * 解决外部AI API无法访问 localhost 的问题
 */
async function resolveImageToDataUri(imageInput: string): Promise<string> {
  let input = imageInput;

  // 处理 localhost/127.0.0.1 的完整URL → 提取路径部分
  if (input.startsWith('http://localhost') || input.startsWith('http://127.0.0.1') ||
      input.startsWith('https://localhost') || input.startsWith('https://127.0.0.1')) {
    try {
      const u = new URL(input);
      input = u.pathname;
    } catch { /* 解析失败，保持原样 */ }
  }

  // 本地文件路径（上传后保存的相对路径）
  if (input.startsWith('/uploads/') || (input.startsWith('/') && !input.startsWith('//'))) {
    const filePath = path.join(process.cwd(), 'public', input);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  if (input.startsWith('data:')) return input;
  return imageInput;
}

async function analyzeImageWithAI(
  imageInput: string,
  userInfo?: { center?: string; department?: string }
): Promise<{
  location: string;
  hazard_description: string;
  hazard_level: string;
  raw_output: string;
}> {
  const apiBase = process.env.AI_API_BASE || '';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_VISION_MODEL || 'mimo-v2.5';

  if (!apiBase || !apiKey) {
    throw new Error('未配置AI服务（缺少 AI_API_BASE / AI_API_KEY 环境变量）');
  }

  // 将图片解析为 base64 data URI（解决外部API无法访问localhost的问题）
  const url = await resolveImageToDataUri(imageInput);

  const currentDate = getCurrentDate();
  const userContext = userInfo?.center || userInfo?.department
    ? `用户所属中心/部门：${userInfo.center || ''} ${userInfo.department || ''}`
    : '';

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `你是专业的城市轨道交通运营公司物资仓储领域安全隐患识别专家。请仔细分析上传的现场图片，识别所有可能存在的安全隐患。

## 隐患定义
指违反安全生产法律、法规、规章、标准、规程和安全生产管理制度的规定，或者因其他因素在生产经营活动中存在可能导致事故发生的人的不安全行为、物的危险状态、环境的不安全因素、管理上的缺陷。

## 识别原则
1. 如实描述，严禁臆测：只描述图片中确实可见的内容，不得推测或编造看不到的细节
2. 准确区分，避免误判：仔细区分容易混淆的隐患类型
3. 客观观察，先看后判：先描述图片中实际观察到的现象，再判断隐患类型

## 输出格式（必须严格遵循）
输出一段完整的连续段落文字，不要分条、不要编号、不要用【】标记。
整体结构为：排查日期+排查发现+具体地点+发现隐患的具体现象描述+隐患分类定性+存在的安全风险+可能导致的事故后果。

正确示例（必须模仿这个格式）：
6月20日排查发现，物资后勤中心物资仓储部仓库内，发现防汛专用沙袋存在表面破损、出现白色霉斑的现象，部分沙袋外观变形，属于防汛物资变质失效，存在防汛安全隐患，在汛期无法正常发挥防汛挡水作用，可能导致区域内出现积水倒灌风险。

要求：
- 整段输出，不分条目，不编号，不用任何标记符号
- 语言流畅自然，像人工填写的一样
- 开头用"X月X日排查发现"
- 中间描述具体看到了什么（现象）
- 然后定性分类（属于什么类型的隐患）
- 最后说存在什么风险、可能导致什么后果

当前日期：${currentDate}
${userContext ? '\n' + userContext : ''}`
        },
        {
          role: 'user',
          content: userContext ? [
            {
              type: 'image_url',
              image_url: { url, detail: 'high' }
            },
            {
              type: 'text',
              text: `请仔细分析这张图片中的所有安全隐患。\n${userContext}\n\n输出一段连续的文字描述，模仿上述示例格式。如果图片中没有明显隐患也要如实说明。`
            }
          ] : [
            {
              type: 'image_url',
              image_url: { url, detail: 'high' }
            },
            {
              type: 'text',
              text: '请仔细分析这张图片中的所有安全隐患。输出一段连续的文字描述，模仿系统提示中的示例格式。'
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API错误 (${response.status}): ${errText}`);
  }

  const data = await response.json() as any;
  // 兼容推理模型（如MiMo-V2.5）的 reasoning_content 字段
  const msg = data.choices?.[0]?.message || {};
  const content = (msg.content || msg.reasoning_content || '').trim();

  if (!content || content.length < 10) {
    throw new Error('AI返回内容为空或过短');
  }

  // 从连续段落中提取各字段
  // 原系统格式："6月20日排查发现，物资后勤中心物资仓储部仓库内，发现...，属于...，存在...，可能导致..."
  const dateMatch = content.match(/(\d+月\d+日)排查发现/);
  const dateStr = dateMatch ? dateMatch[1] : currentDate;

  // 提取地点（"排查发现，"之后到"仓库内/内/"之间的文字）
  const locMatch = content.match(/排查发现[，,](.+?)(?:仓库内|内|区域|场地|车间|库房|现场|场所|部位|位置|发现)/);
  const location = locMatch ? locMatch[1].trim() : (userInfo?.department || '');

  // 判断隐患等级
  let level = 'general_ii';
  if (
    content.includes('人员伤亡') || content.includes('伤亡') ||
    content.includes('消防') || content.includes('火灾') ||
    content.includes('物体打击') || content.includes('碾压') || content.includes('坠落') ||
    content.includes('触电') || content.includes('特种设备') ||
    content.includes('通道堵塞') || content.includes('I级')
  ) {
    level = 'general_i';
  }

  return {
    location,
    hazard_description: content,
    hazard_level: level,
    raw_output: content,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { image_base64, image_url } = body;
    const imageInput = image_base64 || image_url;

    if (!imageInput) {
      return NextResponse.json(
        { success: false, error: '请提供图片数据（image_base64 或 image_url）' },
        { status: 400 }
      );
    }

    const result = await analyzeImageWithAI(imageInput, {
      center: user.inspection_center,
      department: user.inspection_department
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('AI analyze error:', error);

    const msg = String(error.message || error || '');
    if (msg.includes('未配置') || msg.includes('API_KEY')) {
      return NextResponse.json(
        { success: false, error: msg, code: 'NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || '图片分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
