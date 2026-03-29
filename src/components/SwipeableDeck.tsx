'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PoemCard, { Poem } from './PoemCard';
import InkSplash from './Confetti';
import LockScreen from './LockScreen';

const MAX_EYE_CARE_TIME = 10 * 60; // 10分钟

export default function SwipeableDeck() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [direction, setDirection] = useState(0);

  // --- 护眼锁状态 ---
  const [isLocked, setIsLocked] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasStartedInteracting, setHasStartedInteracting] = useState(false);

  const rewardAudioRef = useRef<HTMLAudioElement | null>(null);

  const userId = 'xiaofang_01';

  // Load poems & restore timer
  useEffect(() => {
    const savedTime = localStorage.getItem('eye_care_time');
    if (savedTime) setElapsedTime(parseInt(savedTime));

    async function loadPoems() {
      try {
        const res = await fetch(`/api/poems?userId=${userId}&limit=50`);
        const json = await res.json();
        if (json.success) setPoems(json.data);
      } catch (error) {
        console.error('Failed to load poems:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPoems();
  }, []);

  // 10分钟自动锁屏逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasStartedInteracting && !isLocked) {
      timer = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          // 每分钟悄悄存档
          if (next % 60 === 0) {
            localStorage.setItem('eye_care_time', next.toString());
          }
          if (next >= MAX_EYE_CARE_TIME) {
            setIsLocked(true);
            return next;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [hasStartedInteracting, isLocked]);

  const triggerInteraction = () => {
    if (!hasStartedInteracting) setHasStartedInteracting(true);
  };

  // Stop reward music and clear animation when changing pages or unmounting
  useEffect(() => {
    setShowReward(false); // 划走时强制清理奖励动画
    return () => {
      if (rewardAudioRef.current) {
        rewardAudioRef.current.pause();
        rewardAudioRef.current = null;
      }
    };
  }, [currentIndex]);

  const handleMarkLearned = async (id: string, isLearned: boolean) => {
    setPoems(prev => prev.map(p => p.id === id ? { ...p, isLearned } : p));

    if (isLearned) {
      setShowReward(true);
      // Play reward music
      if (rewardAudioRef.current) {
        rewardAudioRef.current.pause();
      }
      const audio = new Audio('/music/reward.mp3');
      rewardAudioRef.current = audio;
      audio.play().catch(e => console.error("Music play blocked:", e));
    } else {
      setShowReward(false);
      if (rewardAudioRef.current) {
        rewardAudioRef.current.pause();
        rewardAudioRef.current = null;
      }
    }

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, poemId: id, isLearned }),
    });
  };

  const navigate = (dir: number) => {
    const next = currentIndex + dir;
    if (next >= 0 && next < poems.length) {
      setDirection(dir);
      setCurrentIndex(next);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-paper)' }}>
        <p className="text-lg tracking-widest" style={{ color: 'var(--color-ink-faint)', fontFamily: 'var(--font-title)' }}>
          ……
        </p>
      </div>
    );
  }

  if (poems.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-paper)' }}>
        <p style={{ color: 'var(--color-ink-light)', fontFamily: 'var(--font-title)' }}>
          无诗可读
        </p>
      </div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <motion.main
      onPointerDown={triggerInteraction}
      className="relative w-full h-[100dvh] max-w-md mx-auto overflow-hidden flex flex-col transition-colors duration-700"
      style={{
        backgroundColor: poems[currentIndex]?.isLearned ? 'var(--color-paper-learned)' : 'var(--color-paper)'
      }}
    >
      <LockScreen
        isLocked={isLocked}
        onUnlock={() => {
          setIsLocked(false);
          setElapsedTime(0);
          localStorage.setItem('eye_care_time', '0');
        }}
      />
      {showReward && <InkSplash />}

      {/* Poem Area */}
      <div
        className="flex-1 relative overflow-hidden no-scrollbar"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          (e.currentTarget as any)._startX = touch.clientX;
        }}
        onTouchEnd={(e) => {
          const startX = (e.currentTarget as any)._startX;
          const endX = e.changedTouches[0].clientX;
          const diff = startX - endX;
          if (Math.abs(diff) > 60) {
            navigate(diff > 0 ? 1 : -1);
          }
        }}
      >
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 35 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 overflow-y-auto no-scrollbar"
          >
            <PoemCard
              poem={poems[currentIndex]}
              onMarkLearned={handleMarkLearned}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimal dot indicator */}
      <div className="flex justify-center gap-1.5 pb-8 pt-2">
        {poems.slice(
          Math.max(0, currentIndex - 3),
          Math.min(poems.length, currentIndex + 4)
        ).map((_, i) => {
          const actualIndex = Math.max(0, currentIndex - 3) + i;
          return (
            <div
              key={actualIndex}
              className={`dot-indicator ${actualIndex === currentIndex ? 'active' : ''}`}
              style={{
                backgroundColor: poems[currentIndex]?.isLearned ? 'rgba(255,255,255,0.4)' : undefined
              }}
            />
          );
        })}
      </div>
    </motion.main>
  );
}
