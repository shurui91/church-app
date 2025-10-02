// contexts/FontSizeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FontSizeContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  min: number;
  max: number;
  step: number;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined
);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(20); // 默认值 20

  const min = 12;
  const max = 40;
  const step = 4;

  // 从存储中读取字体大小
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem('fontSize');
        if (saved) {
          const parsed = Number(saved);
          if (!Number.isFinite(parsed)) {
            // 如果解析失败，回退到默认值
            setFontSize(20);
          } else {
            setFontSize(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load font size preference', error);
      }
    };
    loadFontSize();
  }, []);

  // 保存字体大小（确保不会存 NaN）
  useEffect(() => {
    const saveFontSize = async () => {
      try {
        if (Number.isFinite(fontSize)) {
          await AsyncStorage.setItem('fontSize', String(fontSize));
        }
      } catch (error) {
        console.error('Failed to save font size preference', error);
      }
    };
    saveFontSize();
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, min, max, step }}>
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
