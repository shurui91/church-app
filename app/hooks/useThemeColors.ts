// hooks/useThemeColors.ts
import { useTheme } from '../context/ThemeContext';

export function useThemeColors() {
  const { isDark } = useTheme();

  return {
    // 背景色
    background: isDark ? '#121212' : '#f8f9fa',
    backgroundSecondary: isDark ? '#1e1e1e' : '#ffffff',

    // 文字颜色
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#b0b0b0' : '#666666',
    textTertiary: isDark ? '#888888' : '#999999',

    // 边框和分隔线
    border: isDark ? '#333333' : '#e0e0e0',
    borderLight: isDark ? '#444444' : '#f0f0f0',

    // 品牌色
    primary: '#007AFF',
    primaryDark: '#0056cc',

    // 状态色
    success: isDark ? '#4CD964' : '#34C759',
    warning: isDark ? '#FFCC00' : '#FF9500',
    error: isDark ? '#FF3B30' : '#FF2D55',

    // 卡片和表面
    card: isDark ? '#1e1e1e' : '#ffffff',
    cardSecondary: isDark ? '#2a2a2a' : '#f8f9fa',

    // 导航相关
    tabBar: isDark ? '#1c1c1e' : '#ffffff',
    tabBarBorder: isDark ? '#38383a' : '#e5e5ea',

    // 开关控件
    switchThumb: isDark ? '#007AFF' : '#f4f3f4',
    switchTrack: { false: isDark ? '#767577' : '#f0f0f0', true: '#81b0ff' },
  };
}
