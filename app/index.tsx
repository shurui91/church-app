// app/index.tsx
import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 先等待3.5秒，然后用0.5秒做淡出动画
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // 动画完成后跳转
        router.replace('/home');
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/splash-earth.jpg')}
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
