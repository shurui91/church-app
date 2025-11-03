import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'app.theme'; // AsyncStorage key for theme preference

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // 从存储中读取主题偏好
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme !== null) {
          // 如果用户之前保存过偏好，使用保存的值
          setIsDark(savedTheme === 'dark');
        } else {
          // 如果没有保存的偏好，使用系统主题
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
        // 如果读取失败，使用系统主题
        setIsDark(systemColorScheme === 'dark');
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // 当系统主题改变时，如果用户没有手动设置过偏好，则跟随系统
  useEffect(() => {
    // 只有在加载完成后才跟随系统主题变化
    if (!isLoaded) return;

    const checkAndFollowSystem = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        // 如果没有保存的偏好（用户从未手动切换过），跟随系统主题
        if (savedTheme === null) {
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to check theme preference', error);
      }
    };

    checkAndFollowSystem();
  }, [systemColorScheme, isLoaded]);

  // 切换主题并保存到存储
  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    try {
      // 保存用户的主题偏好
      await AsyncStorage.setItem(THEME_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
