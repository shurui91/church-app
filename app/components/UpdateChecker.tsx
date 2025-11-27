import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import * as Updates from 'expo-updates';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';

interface UpdateCheckerProps {
  onUpdateComplete: () => void;
  onUpdateSkipped: () => void;
  // 模拟模式：设置为 true 时模拟大量更新下载（用于测试）
  simulateLargeUpdate?: boolean;
}

export default function UpdateChecker({ onUpdateComplete, onUpdateSkipped, simulateLargeUpdate = false }: UpdateCheckerProps) {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const [status, setStatus] = useState<'checking' | 'downloading' | 'applying' | 'complete' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0); // 0-100
  const [downloadSize, setDownloadSize] = useState<string>(''); // 例如 "15.2 MB"
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 淡入动画
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    checkAndDownloadUpdate();
  }, []);

  useEffect(() => {
    // 下载时显示进度条动画
    if (status === 'downloading') {
      // 根据模拟模式设置不同的动画时长
      const duration = simulateLargeUpdate ? 8000 : 2000;
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
      setDownloadProgress(0);
    }
  }, [status, simulateLargeUpdate]);

  // 模拟下载进度更新
  const simulateDownloadProgress = async (duration: number) => {
    const steps = 30; // 分30步更新进度，更平滑
    const stepDuration = duration / steps;
    const progressStep = 100 / steps;
    
    // 模拟下载大小（随机生成一个合理的大小）
    const sizeInMB = 5 + Math.random() * 15; // 5-20 MB
    setDownloadSize(`${sizeInMB.toFixed(1)} MB`);

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      const progress = Math.min(i * progressStep, 100);
      setDownloadProgress(progress);
      
      // 更新进度条动画值
      progressAnim.setValue(progress / 100);
    }
  };

  const checkAndDownloadUpdate = async () => {
    try {
      // 1. 检查是否在开发环境或模拟模式
      if (__DEV__ && !simulateLargeUpdate) {
        console.log('[UpdateChecker] Development mode, skipping update check');
        onUpdateSkipped();
        return;
      }

      // 2. 模拟模式：直接模拟下载过程
      if (simulateLargeUpdate || (__DEV__ && simulateLargeUpdate)) {
        console.log('[UpdateChecker] Simulating large update download...');
        
        // 模拟检查更新
        setStatus('checking');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟下载大量更新
        setStatus('downloading');
        await simulateDownloadProgress(8000); // 8秒下载时间
        
        // 模拟应用更新
        setStatus('applying');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 完成
        setStatus('complete');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 在模拟模式下，不实际执行 reload，而是直接跳过
        console.log('[UpdateChecker] Simulated update complete');
        onUpdateSkipped(); // 模拟模式下跳过实际更新
        return;
      }

      // 3. 检查 Updates 是否可用
      if (!Updates.isEnabled) {
        console.log('[UpdateChecker] Updates are not enabled');
        // 即使不可用，也显示检查过程至少2秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        onUpdateSkipped();
        return;
      }

      // 4. 检查是否有可用更新（显示检查过程至少2.5秒）
      setStatus('checking');
      
      // 先等待一段时间，让用户看到"正在检查更新..."
      const checkStartTime = Date.now();
      const minCheckDuration = 2500; // 至少显示2.5秒
      
      const update = await Updates.checkForUpdateAsync();
      
      // 确保检查过程至少持续 minCheckDuration 毫秒
      const elapsedTime = Date.now() - checkStartTime;
      if (elapsedTime < minCheckDuration) {
        await new Promise(resolve => setTimeout(resolve, minCheckDuration - elapsedTime));
      }
      
      if (!update.isAvailable) {
        console.log('[UpdateChecker] No update available');
        // 没有更新时，再显示一下"检查完成"的状态
        await new Promise(resolve => setTimeout(resolve, 500));
        onUpdateSkipped();
        return;
      }

      // 5. 开始下载更新
      console.log('[UpdateChecker] Update available, downloading...');
      setStatus('downloading');

      // 开始下载前，先显示一下准备状态
      await new Promise(resolve => setTimeout(resolve, 300));

      // 下载更新（实际下载）
      const downloadStartTime = Date.now();
      const fetchResult = await Updates.fetchUpdateAsync();
      
      if (!fetchResult.isNew) {
        console.log('[UpdateChecker] Update fetched but not new');
        onUpdateSkipped();
        return;
      }

      // 模拟下载进度显示（即使实际下载很快，也要显示进度让用户看到）
      const actualDownloadTime = Date.now() - downloadStartTime;
      const minDownloadDuration = 6000; // 至少显示6秒下载过程
      
      if (actualDownloadTime < minDownloadDuration) {
        // 如果实际下载很快，模拟一个更长的下载过程
        await simulateDownloadProgress(minDownloadDuration);
      } else {
        // 如果实际下载时间较长，使用实际进度
        // 这里简化处理，直接显示完成
        await simulateDownloadProgress(Math.min(actualDownloadTime, 10000));
      }

      // 6. 应用更新
      console.log('[UpdateChecker] Update downloaded, applying...');
      setStatus('applying');

      // 显示应用更新过程至少1.5秒
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 7. 标记完成并触发 reload
      setStatus('complete');
      
      // 显示完成状态至少1秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 8. 执行 reload
      await Updates.reloadAsync();
      
      // 如果 reload 没有立即生效，调用完成回调
      onUpdateComplete();
    } catch (e: any) {
      console.error('[UpdateChecker] Update check/download failed:', e);
      setStatus('error');
      setErrorMessage(e?.message || '更新检查失败');
      
      // 错误时也继续应用流程，不阻塞用户
      setTimeout(() => {
        onUpdateSkipped();
      }, 2000);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return '正在检查更新...';
      case 'downloading':
        return downloadSize 
          ? `正在下载更新... (${downloadProgress.toFixed(0)}%)`
          : '正在下载更新...';
      case 'applying':
        return '正在应用更新...';
      case 'complete':
        return '更新完成！';
      case 'error':
        return errorMessage || '更新失败';
      default:
        return '正在检查更新...';
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.content}>
        <ActivityIndicator 
          size="large" 
          color={status === 'error' ? colors.error : colors.primary} 
          style={styles.spinner}
        />
        <Text 
          style={[
            styles.statusText,
            { 
              color: status === 'error' ? colors.error : colors.text,
              fontSize: getFontSizeValue(18),
            }
          ]}
        >
          {getStatusText()}
        </Text>
        {status === 'downloading' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            {downloadSize && (
              <Text 
                style={[
                  styles.downloadSize,
                  { 
                    color: colors.textSecondary,
                    fontSize: getFontSizeValue(12),
                  }
                ]}
              >
                {downloadSize}
              </Text>
            )}
          </View>
        )}
        {status === 'error' && (
          <Text 
            style={[
              styles.errorHint,
              { 
                color: colors.textSecondary,
                fontSize: getFontSizeValue(14),
              }
            ]}
          >
            将在2秒后继续启动应用
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  spinner: {
    marginBottom: 24,
  },
  statusText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    width: 240,
    marginTop: 16,
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorHint: {
    marginTop: 8,
    textAlign: 'center',
  },
  downloadSize: {
    marginTop: 8,
    textAlign: 'center',
  },
});

