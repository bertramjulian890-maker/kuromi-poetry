'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  password?: string;
}

export default function LockScreen({ isLocked, onUnlock, password = '8888' }: LockScreenProps) {
  const [input, setInput] = useState('');
  const [isError, setIsError] = useState(false);

  const handleKeypad = (num: string) => {
    const newVal = (input + num).slice(0, 4);
    setInput(newVal);
    
    if (newVal.length === 4) {
      if (newVal === password) {
        onUnlock();
        setInput('');
      } else {
        setIsError(true);
        setTimeout(() => {
          setIsError(false);
          setInput('');
        }, 600);
      }
    }
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#2d1b4d] flex flex-col items-center justify-center text-white px-8"
        >
          {/* Kuromi Eye Care Message */}
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center mb-12"
          >
            <div className="text-6xl mb-6">🌙</div>
            <h2 className="text-3xl font-bold mb-4 tracking-widest text-[#ffda6e]">宝贝该休息啦</h2>
            <p className="text-lg opacity-80 leading-relaxed">
              好视力，更美丽。<br />
              眼睛闭上两分钟，请妈妈来解锁哦。
            </p>
          </motion.div>

          {/* Password Display Dots */}
          <div className="flex gap-4 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                className={`w-4 h-4 rounded-full border-2 border-[#ffda6e] ${
                  input.length > i ? 'bg-[#ffda6e]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Custom Keypad */}
          <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'X'].map((val, i) => (
              <button
                key={i}
                onClick={() => {
                  if (typeof val === 'number') handleKeypad(val.toString());
                  if (val === 'X') setInput('');
                }}
                disabled={val === ''}
                className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
                  val === '' ? 'opacity-0' : 'bg-white/10 active:bg-white/20 hover:bg-white/15'
                } ${isError ? 'text-red-400' : 'text-white'}`}
              >
                {val}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
