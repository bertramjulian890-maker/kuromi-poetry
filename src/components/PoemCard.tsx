'use client';

import { motion } from 'framer-motion';
import { useAudio } from './AudioPlayer';

export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  paragraphs: string[];
  isLearned?: boolean;
}

interface PoemCardProps {
  poem: Poem;
  onMarkLearned: (id: string, isLearned: boolean) => void;
}

export default function PoemCard({ poem, onMarkLearned }: PoemCardProps) {
  const { play, stop, playingText } = useAudio();

  const titleText = `${poem.title}。${poem.dynasty}。${poem.author}`;
  const wholePoemText = `${poem.title}。${poem.dynasty}。${poem.author}。${poem.paragraphs.join('。')}`;
  
  const isTitlePlaying = playingText === titleText || playingText === wholePoemText;

  // --- 智能适配算法：根据内容长度动态调整间距和字号 ---
  // 改进：基于字数长度智能断句。五言（较短）不拆分，七言（较长）拆分
  const displayLines = poem.paragraphs.flatMap(p => {
    // 如果一整段（通常是两句）字数 <= 12 (比如五言 5+5+标点)，则不拆分保持原样
    if (p.length <= 12) return [p];
    
    // 如果超过 12 个字 (通常是七言 7+7+标点)，则从中间的逗号/句号拆分
    const parts = p.match(/[^，。？！、]+[，。？！、]?/g);
    return parts || [p];
  });

  const lineCount = displayLines.length;
  const isExtraLong = lineCount > 10; // 拆分后行数会增加
  const isLong = lineCount > 6; 
  const totalChars = displayLines.join('').length;

  const titleSize = poem.title.length > 8 ? 'text-2xl' : 'text-3xl';
  const fontSize = (isExtraLong || totalChars > 160) ? 'text-base' : isLong ? 'text-lg' : 'text-xl';
  // 针对行数变多，进一步收缩间距
  const poemGap = isExtraLong ? 'gap-1.5' : isLong ? 'gap-3' : 'gap-5';
  const headerMargin = isLong ? 'mb-3' : 'mb-6';

  // 根据学会状态动态计算文字基准颜色
  const baseTextColor = poem.isLearned ? '#ffffff' : 'var(--color-ink)';
  const secondaryTextColor = poem.isLearned ? 'rgba(255,255,255,0.7)' : 'var(--color-ink-light)';
  const highlightColor = poem.isLearned ? '#ffda6e' : 'var(--color-seal)'; // 在紫色背景下，高亮用明亮的淡金色

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ 
        opacity: 1, 
        y: 0
      }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={`relative w-full h-full flex flex-col items-center px-10 ${isLong ? 'pt-16' : 'pt-24'} pb-12 page-enter`}
    >
      {/* Universal Floating Play Button - Positioned at the very top-right of the page */}
      <div className="absolute top-8 right-8 z-20">
        <button
          onClick={() => {
            if (playingText === wholePoemText) {
              stop();
            } else {
              play(wholePoemText);
            }
          }}
          className="w-12 h-12 flex items-center justify-center transition-all active:scale-90"
          style={{ color: poem.isLearned ? '#ffda6e' : '#e6a23c' }}
        >
          {playingText === wholePoemText ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg className="ml-1" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
      </div>

      {/* Title Area - Now purely centered and clean */}
      <div className={`flex flex-col items-center gap-2 ${headerMargin} text-center w-full max-w-sm`}>
        <h1
          className={`${titleSize} font-bold tracking-widest leading-relaxed cursor-pointer transition-colors duration-500 ${
            isTitlePlaying ? 'playing' : ''
          }`}
          style={{ 
            fontFamily: 'var(--font-poem)', 
            color: isTitlePlaying ? highlightColor : baseTextColor 
          }}
          onClick={() => play(titleText)}
        >
          {poem.title}
        </h1>

        {/* Author & Dynasty */}
        <p
          className={`text-sm tracking-[0.4em] transition-colors duration-500`}
          style={{ 
            color: isTitlePlaying ? highlightColor : secondaryTextColor 
          }}
        >
          {poem.dynasty} · {poem.author}
        </p>
      </div>

      {/* Poem Body — Controlled spacing */}
      <div className={`flex-1 w-full flex flex-col items-center justify-center ${poemGap} max-w-sm py-2`}>
        {displayLines.map((line, index) => {
          const isLinePlaying = playingText === line || playingText === wholePoemText;
          return (
            <p
              key={index}
              onClick={() => play(line)}
              className={`verse-line ${fontSize} text-center leading-[1.6] tracking-widest select-none w-full transition-all duration-500 ${
                isLinePlaying ? 'playing' : ''
              }`}
              style={{ 
                fontFamily: 'var(--font-poem)',
                color: isLinePlaying ? highlightColor : baseTextColor 
              }}
            >
              {line}
            </p>
          );
        })}
      </div>

      {/* Bottom Action Area */}
      <div className={`${isLong ? 'mt-4' : 'mt-8'} flex flex-col items-center`}>
        <button
          onClick={() => onMarkLearned(poem.id, !poem.isLearned)}
          className="relative transition-all duration-300 active:scale-90"
        >
          {poem.isLearned ? (
            <div 
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all shadow-xl"
              style={{ backgroundColor: '#e6b800', borderColor: '#e6b800', color: 'rgba(0,0,0,0.6)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          ) : (
            <div 
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all hover:border-[#e6b800] group"
              style={{ 
                borderColor: poem.isLearned ? 'rgba(255,255,255,0.2)' : 'rgba(50, 47, 46, 0.1)', 
                color: poem.isLearned ? '#ffffff' : 'rgba(50, 47, 46, 0.15)' 
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}
