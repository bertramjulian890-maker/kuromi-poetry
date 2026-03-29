import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default_user';
    const limit = parseInt(searchParams.get('limit') || '50');

    // 1. 读取本地诗词清单 (仓库自带的静态 JSON)
    const dataFilePath = path.join(process.cwd(), 'src', 'data', 'poems.json');
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    const poems = JSON.parse(fileContents);

    // 2. 从云端 KV 读取用户进度 (取代本地 progress_*.json)
    const kvKey = `progress:${userId}`;
    const learnedPoemIds: string[] = await kv.get<string[]>(kvKey) || [];

    // 3. 注入“已学会”标记
    const processedPoems = poems.map((poem: any) => ({
      ...poem,
      isLearned: learnedPoemIds.includes(poem.id)
    }));

    // 4. 儿童友好过滤逻辑 (标点符号计数 <= 8)
    const MAX_CLAUSES = 8; 
    const childFriendlyPoems = processedPoems.filter((poem: any) => {
      const fullText = poem.paragraphs.join('');
      const clauseCount = (fullText.match(/[，。？！、]/g) || []).length;
      return clauseCount <= MAX_CLAUSES;
    });

    // 5. 智能权重乱序逻辑
    const shuffled = [...childFriendlyPoems].sort(() => Math.random() - 0.5);
    const unlearned = shuffled.filter(p => !p.isLearned);
    const learned = shuffled.filter(p => p.isLearned);

    const result: any[] = [];
    let uIdx = 0;
    let lIdx = 0;

    // 混合策略：每推 4 个“新朋友”，穿插一个“老朋友”巩固复习
    while (result.length < limit && (uIdx < unlearned.length || lIdx < learned.length)) {
      if (uIdx < unlearned.length && (result.length % 5 !== 0 || lIdx >= learned.length)) {
        result.push(unlearned[uIdx++]);
      } else if (lIdx < learned.length) {
        result.push(learned[lIdx++]);
      } else if (uIdx < unlearned.length) {
        result.push(unlearned[uIdx++]);
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('云端读取异常:', error);
    return NextResponse.json(
      { success: false, error: '无法从云端获取诗词清单' },
      { status: 500 }
    );
  }
}
