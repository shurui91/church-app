// contexts/FontSizeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeLevel = 'small' | 'medium' | 'large' | 'xlarge';

interface FontSizeContextType {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  getFontSizeValue: (baseSize: number) => number;
  fontSizeOptions: { label: string; value: FontSizeLevel }[];
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined
);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSizeLevel>('medium');

  // 字体大小选项配置
  const fontSizeOptions = [
    { label: '小', value: 'small' as FontSizeLevel },
    { label: '标准', value: 'medium' as FontSizeLevel },
    { label: '大', value: 'large' as FontSizeLevel },
    { label: '超大', value: 'xlarge' as FontSizeLevel },
  ];

  useEffect(() => {
    // 从存储中读取字体大小设置
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem('fontSize');
        if (saved && ['small', 'medium', 'large', 'xlarge'].includes(saved)) {
          setFontSize(saved as FontSizeLevel);
        }
      } catch (error) {
        console.error('Failed to load font size preference', error);
      }
    };
    loadFontSize();
  }, []);

  // 保存字体大小设置
  useEffect(() => {
    const saveFontSize = async () => {
      try {
        await AsyncStorage.setItem('fontSize', fontSize);
      } catch (error) {
        console.error('Failed to save font size preference', error);
      }
    };
    saveFontSize();
  }, [fontSize]);

  // 根据字体等级获取实际字体大小
  const getFontSizeValue = (baseSize: number): number => {
    const multipliers = {
      small: 0.9,
      medium: 1,
      large: 1.2,
      xlarge: 1.4,
    };
    return Math.round(baseSize * multipliers[fontSize]);
  };

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        setFontSize,
        getFontSizeValue,
        fontSizeOptions,
      }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
