import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: '未提供音频数据' }, { status: 400 });
    }

    const asrUrl = process.env.ASR_API_URL || 'https://api.siliconflow.cn/v1/audio/transcriptions';
    const asrKey = process.env.ASR_API_KEY;
    const model = process.env.ASR_MODEL || 'TeleAI/TeleSpeechASR';

    if (!asrKey) {
      return NextResponse.json({
        text: '',
        warning: '语音识别服务未配置，请设置 ASR_API_KEY',
      });
    }

    // 将 base64 转为 Buffer
    let audioBuffer: Buffer;
    if (audioBase64.startsWith('data:')) {
      const base64Data = audioBase64.split(',')[1];
      audioBuffer = Buffer.from(base64Data, 'base64');
    } else {
      audioBuffer = Buffer.from(audioBase64, 'base64');
    }

    // 构建 FormData 发送给硅基流动
    const formData = new FormData();
    const blob = new Blob([audioBuffer] as any, { type: 'audio/webm' });
    formData.append('file', blob, 'recording.webm');
    formData.append('model', model);

    const resp = await fetch(asrUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${asrKey}`,
      },
      body: formData,
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('ASR Error:', data);
      return NextResponse.json({
        error: data.message || '语音识别失败',
        text: '',
      }, { status: 500 });
    }

    return NextResponse.json({
      text: data.text || '',
      audioUrl: '',
    });
  } catch (error: any) {
    console.error('ASR Error:', error);
    return NextResponse.json(
      { error: error.message || '语音识别失败' },
      { status: 500 }
    );
  }
}
