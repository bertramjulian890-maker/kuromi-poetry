'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudio() {
  const [playingText, setPlayingText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 组件卸载（划走）时强制停止音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingText(null);
  }, []);

  const play = useCallback(async (text: string) => {
    // 停止当前正在播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 点同一行且正在播 → 停止
    if (playingText === text) {
      setPlayingText(null);
      return;
    }

    // 立即高亮，让用户感受到响应
    setPlayingText(text);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('[AudioPlayer] TTS API error:', response.status);
        setPlayingText(current => current === text ? null : current);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingText(current => current === text ? null : current);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingText(current => current === text ? null : current);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('[AudioPlayer] play error:', err);
      setPlayingText(current => current === text ? null : current);
    }
  }, [playingText]);

  return { play, stop, playingText };
}
