import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        title: '隐私条款',
        headerShown: true // 显示头部返回按钮
      }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>隐私政策</Text>
          <Text style={styles.paragraph}>最后更新日期：2025年1月1日</Text>

          <Text style={styles.subtitle}>1. 信息收集</Text>
          <Text style={styles.paragraph}>
            我们致力于保护您的隐私。本应用仅收集必要的个人信息以提供更好的服务体验。
          </Text>

          <Text style={styles.subtitle}>2. 信息使用</Text>
          <Text style={styles.paragraph}>
            收集的信息将用于：提供和维护服务、改善用户体验、开发新功能。
          </Text>

          <Text style={styles.subtitle}>3. 数据安全</Text>
          <Text style={styles.paragraph}>
            我们采用合理的安全措施来保护您的个人信息免遭未经授权的访问、使用或披露。
          </Text>

          <Text style={styles.subtitle}>4. 联系我们</Text>
          <Text style={styles.paragraph}>
            如果您对隐私政策有任何疑问，请通过 email@example.com 与我们联系。
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
});