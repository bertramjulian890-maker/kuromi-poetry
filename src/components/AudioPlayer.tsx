'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudio() {
  const [playingText, setPlayingText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // 核心修复：组件卸载（划走）时强制停止一切语音
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingText(null);
  }, []);

  const play = useCallback(async (text: string) => {
    // 立即停止当前，并记录本次播放的内容
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 如果点的是同一行且正在播，则停止
    if (playingText === text) {
      setPlayingText(null);
      return;
    }

    // 立即更新高亮
    setPlayingText(text);

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = 
        voices.find(v => v.lang.includes('zh-CN') && (v.name.includes('Premium') || v.name.includes('Supreme'))) ||
        voices.find(v => v.lang.includes('zh-CN') && v.name.includes('Online')) ||
        voices.find(v => v.lang.includes('zh-CN') && v.name.includes('Google')) ||
        voices.find(v => v.lang.includes('zh-CN'));

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.onend = () => {
          // 只有当结束的音频依然是当前记录的文本时，才清空高亮
          // 这样可以防止连续点击时，旧音频的结束回调误伤新音频的高亮
          setPlayingText(current => current === text ? null : current);
        };
        utterance.onerror = () => {
          setPlayingText(current => current === text ? null : current);
        };
        
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
        return;
      }
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingText(current => current === text ? null : current);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setPlayingText(null);
    }
  }, [playingText]);

  return { play, stop, playingText };
}
