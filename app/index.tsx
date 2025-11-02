// app/index.tsx
import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from './src/context/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // 先等待1.5秒，然后用0.5秒做淡出动画
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // 动画完成后根据认证状态跳转
        if (isAuthenticated) {
          router.replace('/meeting');
        } else {
          router.replace('/login');
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, isAuthenticated]);

  return (
    <>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/splash-book.png')}
          style={styles.image}
          resizeMode='cover'
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
