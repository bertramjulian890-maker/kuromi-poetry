'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const KUROMI_ICONS = [
  '/icon/icons8-黑美-100.png',
  '/icon/icons8-黑美-100-2.png',
  '/icon/icons8-黑美-100-3.png',
  '/icon/icons8-黑美-100-4.png',
  '/icon/kuromi-seeklogo.png',
  '/icon/kuromi-seeklogo111.png'
];

const EMOJIS = ['💜', '💖', '✨', '🌟', '🍭', '🎈', '🎀', '🔮'];

export default function Confetti() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const newItems = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      isImage: Math.random() > 0.45,
      src: KUROMI_ICONS[Math.floor(Math.random() * KUROMI_ICONS.length)],
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 105 - 2.5, // 均匀分布，带一点边界超出
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 3, // 下落慢一点，更有飘落感，也更省 CPU
      size: 20 + Math.random() * 20,
      rotation: Math.random() * 360,
      drift: -15 + Math.random() * 30,
    }));
    setItems(newItems);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" style={{ perspective: '1000px' }}>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ y: -60, x: `${item.x}vw`, opacity: 0, rotate: item.rotation, scale: 0.8 }}
          animate={{ 
            y: '105vh', 
            x: `${item.x + item.drift}vw`,
            opacity: [0, 1, 1, 0],
            rotate: item.rotation + 720,
            scale: 1
          }}
          transition={{ 
            duration: item.duration, 
            delay: item.delay, 
            ease: "linear",
            repeat: Infinity,
            repeatDelay: Math.random() * 1
          }}
          // 极致优化：开启硬件加速
          style={{
            position: 'absolute',
            fontSize: `${item.size}px`,
            willChange: 'transform, opacity',
            transform: 'translate3d(0,0,0)', 
          }}
        >
          {item.isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={item.src} 
              alt="Kuromi" 
              style={{ width: `${item.size}px`, height: 'auto', display: 'block' }} 
            />
          ) : (
            <span style={{ display: 'block' }}>{item.emoji}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
