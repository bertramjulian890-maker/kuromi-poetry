import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const VOLC_API_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 从环境变量读取配置，任何一个缺失都直接报错，方便排查
    const appId      = process.env.VOLC_APP_ID;
    const accessKey  = process.env.VOLC_ACCESS_KEY;
    const resourceId = process.env.VOLC_RESOURCE_ID;
    const speaker    = process.env.VOLC_SPEAKER;

    if (!appId || !accessKey || !resourceId || !speaker) {
      const missing = ['VOLC_APP_ID', 'VOLC_ACCESS_KEY', 'VOLC_RESOURCE_ID', 'VOLC_SPEAKER']
        .filter(k => !process.env[k]);
      console.error('[TTS] Missing env vars:', missing.join(', '));
      return NextResponse.json(
        { error: `TTS not configured. Missing: ${missing.join(', ')}` },
        { status: 503 }
      );
    }

    // V3 接口 Request Body
    // namespace 必须填 "BidirectionalTTS"，即便这是单向流接口（官方文档明确要求）
    const requestBody = {
      user: { uid: 'poem-reader-user' },
      namespace: 'BidirectionalTTS',
      req_params: {
        text,
        speaker,
        model: 'seed-tts-2.0-expressive',  // 模型变体，放 body 里；Resource ID Header 只填 seed-tts-2.0
        audio_params: {
          format: 'mp3',       // 禁止用 wav，流式下 wav 每块都带 header 会炸
          sample_rate: 24000,
        },
      },
    };

    // V3 鉴权靠三个 Header，与 V1 的 "Authorization: Bearer;token" 完全不同
    const volcResponse = await fetch(VOLC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Api-App-Id':      appId,
        'X-Api-Access-Key':  accessKey,
        'X-Api-Resource-Id': resourceId,
        'X-Api-Request-Id':  randomUUID(),   // 每次必须唯一
      },
      body: JSON.stringify(requestBody),
    });

    if (!volcResponse.ok) {
      const errorText = await volcResponse.text();
      console.error('[TTS] Volcengine upstream error:', volcResponse.status, errorText);
      return NextResponse.json(
        { error: `TTS upstream error ${volcResponse.status}: ${errorText}` },
        { status: 502 }
      );
    }

    if (!volcResponse.body) {
      return NextResponse.json({ error: 'Empty response body from Volcengine' }, { status: 502 });
    }

    // 响应格式：每个 chunk 是一行 JSON
    //   音频块:  { "code": 0,        "data": "BASE64..." }
    //   结束块:  { "code": 20000000, "data": null }
    //
    // 我们在服务端解析每行 JSON → 提取 data → base64 解码 → 流式转发原始 MP3 字节给前端
    const stream = new ReadableStream({
      async start(controller) {
        const reader = volcResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 按换行切分，保留最后一个可能不完整的行继续拼接
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const chunk = JSON.parse(trimmed) as { code: number; data?: string | null; message?: string };

                if (chunk.code === 0 && chunk.data) {
                  // 正常音频块：base64 解码后写入流
                  controller.enqueue(Buffer.from(chunk.data, 'base64'));
                } else if (chunk.code === 20000000) {
                  // 结束标记，不处理
                } else if (chunk.code !== 0) {
                  // 其他非零 code 均为错误
                  console.error('[TTS] Volcengine chunk error, code:', chunk.code, 'message:', chunk.message);
                }
              } catch {
                // 理论上不会有无效 JSON，但加保护避免整个流崩溃
                console.warn('[TTS] Failed to parse chunk line:', trimmed.slice(0, 100));
              }
            }
          }

          // 处理 buffer 中可能残留的最后一行
          if (buffer.trim()) {
            try {
              const chunk = JSON.parse(buffer.trim()) as { code: number; data?: string | null };
              if (chunk.code === 0 && chunk.data) {
                controller.enqueue(Buffer.from(chunk.data, 'base64'));
              }
            } catch {
              // 忽略残留的不完整数据
            }
          }
        } catch (err) {
          controller.error(err);
          return;
        }

        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type':  'audio/mpeg',
        'Cache-Control': 'no-cache, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('[TTS] Route error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
