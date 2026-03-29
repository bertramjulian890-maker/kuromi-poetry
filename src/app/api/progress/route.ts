import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Vercel KV (Redis) 升级版进度 API
 * 取代本地 JSON，实现真正的云端同步
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, poemId, isLearned } = body;

    if (!userId || !poemId) {
      return NextResponse.json({ success: false, error: '缺少关键参数' }, { status: 400 });
    }

    const kvKey = `progress:${userId}`;
    
    // 1. 从云端 KV 读取当前进度 (Redis SISMEMBER 逻辑模拟)
    let learnedPoemIds: string[] = await kv.get<string[]>(kvKey) || [];

    // 2. 更新列表
    if (isLearned) {
      if (!learnedPoemIds.includes(poemId)) {
        learnedPoemIds.push(poemId);
      }
    } else {
      learnedPoemIds = learnedPoemIds.filter(id => id !== poemId);
    }

    // 3. 将更新后的“学霸清单”存回云端
    await kv.set(kvKey, learnedPoemIds);

    return NextResponse.json({ 
      success: true, 
      message: '云端同步成功！', 
      count: learnedPoemIds.length 
    });
  } catch (error) {
    console.error('KV 存储异常:', error);
    return NextResponse.json(
      { success: false, error: '云端连接超时，请检查配置' },
      { status: 500 }
    );
  }
}
