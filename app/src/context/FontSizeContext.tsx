import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FontSizeContextType {
  fontSize: number; // 基础字号（整数）
  setFontSize: (size: number) => void;
  min: number;
  max: number;
  step: number;
  getFontSizeValue: (base: number) => number; // 根据 base 动态计算字号，保证整数
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined
);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<number>(20); // 默认值 20

  const min = 12;
  const max = 40;
  const step = 4;

  // 确保始终存整数
  const setFontSize = (size: number) => {
    const safe = Math.round(size);
    setFontSizeState(safe);
  };

  // 从存储中读取字体大小
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem('fontSize');
        if (saved) {
          const parsed = Number(saved);
          if (Number.isFinite(parsed)) {
            setFontSize(parsed);
          } else {
            setFontSize(20);
          }
        }
      } catch (error) {
        console.error('Failed to load font size preference', error);
      }
    };
    loadFontSize();
  }, []);

  // 保存字体大小（始终存整数）
  useEffect(() => {
    const saveFontSize = async () => {
      try {
        if (Number.isFinite(fontSize)) {
          await AsyncStorage.setItem('fontSize', String(Math.round(fontSize)));
        }
      } catch (error) {
        console.error('Failed to save font size preference', error);
      }
    };
    saveFontSize();
  }, [fontSize]);

  // 提供一个安全的字号计算函数
  const getFontSizeValue = (base: number) => {
    return Math.round((base / 20) * fontSize);
    // 解释：默认 20 → base 正常大小；
    // 如果用户改成 24，则 base*24/20 → 放大 20%
  };

  return (
    <FontSizeContext.Provider
      value={{ fontSize, setFontSize, min, max, step, getFontSizeValue }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
