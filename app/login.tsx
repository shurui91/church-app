import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from './src/context/AuthContext';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from './src/i18n';
import { api } from './src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t, i18n } = useTranslation();
  const { login, sendVerificationCode, isAuthenticated } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneWhitelisted, setPhoneWhitelisted] = useState<boolean | null>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Redirect if already authenticated
  const isAuthenticatedRef = useRef(isAuthenticated);
  
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    console.log('[Login] Ref updated - isAuthenticated:', isAuthenticated);
  }, [isAuthenticated]);
  
  useEffect(() => {
    console.log('[Login] useEffect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('[Login] User authenticated, setting timeout to redirect to /meeting');
      // 添加延迟，避免在登出过程中状态更新导致的误判
      const timeoutId = setTimeout(() => {
        console.log('[Login] Timeout callback - isAuthenticatedRef.current:', isAuthenticatedRef.current);
        // 使用 ref 获取最新值，确保检查的是当前状态
        if (isAuthenticatedRef.current) {
          console.log('[Login] Still authenticated, redirecting to /meeting');
          router.replace('/meeting');
        } else {
          console.log('[Login] User logged out, not redirecting');
        }
      }, 300);
      
      return () => {
        console.log('[Login] Clearing timeout');
        clearTimeout(timeoutId);
      };
    }
  }, [isAuthenticated, router]);

  // Handle keyboard events to scroll content
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Scroll to input when keyboard appears
        setTimeout(() => {
          if (phoneInputRef.current?.isFocused()) {
            scrollViewRef.current?.scrollTo({ y: 100, animated: true });
          } else if (codeInputRef.current?.isFocused()) {
            scrollViewRef.current?.scrollTo({ y: 300, animated: true });
          }
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Optionally scroll back when keyboard hides
        // scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * Validate phone number format
   */
  const validatePhoneNumber = (phone: string): boolean => {
    // Basic validation: should start with + and have digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  /**
   * Normalize phone number (US only - automatically add +1)
   */
  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.length === 10) {
      // 10 digits: add +1 prefix
      return '+1' + digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // 11 digits starting with 1: add + prefix
      return '+' + digits;
    } else if (digits.length < 10) {
      // Less than 10 digits: return as is (user still typing)
      return digits;
    } else {
      // More than 11 digits or other cases: take first 10 digits
      return '+1' + digits.slice(-10);
    }
  };

  /**
   * Format phone number for display (US format: (XXX) XXX-XXXX)
   */
  const formatPhoneDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  /**
   * Check if phone number is whitelisted
   */
  const checkPhoneWhitelist = async (phone: string) => {
    // Only check if we have exactly 10 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setPhoneWhitelisted(null);
      return;
    }

    // Normalize to +1 format for API
    const normalizedPhone = '+1' + digits;

    setCheckingPhone(true);
    try {
      const result = await api.checkPhoneNumber(normalizedPhone);
      setPhoneWhitelisted(result.isWhitelisted);
      // Don't show error message if phone is not whitelisted
      // Just disable the send code button silently
      if (result.isWhitelisted) {
        setError(null);
      }
      // If not whitelisted, phoneWhitelisted will be false, which will disable the button
      // but we don't show an error message
    } catch (error: any) {
      console.error('Error checking phone:', error);
      // Only show error for connection issues, not for whitelist check failures
      const errorMessage = error.message || '检查手机号失败';
      if (errorMessage.includes('无法连接到服务器') || errorMessage.includes('API服务器')) {
        setError('无法连接到服务器，请检查后端服务是否运行');
      } else {
        // For other errors, don't show to user to avoid confusion
        // Just reset state silently
        setPhoneWhitelisted(null);
      }
    } finally {
      setCheckingPhone(false);
    }
  };

  /**
   * Handle phone number input with debounce
   */
  useEffect(() => {
    if (!phoneNumber) {
      setPhoneWhitelisted(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      checkPhoneWhitelist(phoneNumber);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [phoneNumber]);

  /**
   * Handle send verification code
   */
  const handleSendCode = async () => {
    if (countdown > 0) return;

    setError(null);
    
    // Validate US phone number (should be 10 digits)
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError(t('login.invalidPhone') || '请输入10位手机号');
      return;
    }

    // Normalize to +1 format for API
    const normalizedPhone = '+1' + digits;

    setSendingCode(true);
    const result = await sendVerificationCode(normalizedPhone);
    setSendingCode(false);

    if (result.success) {
      // Keep phoneNumber as digits only (don't update with +1 prefix)
      // setPhoneNumber stays as the 10 digits
      setCountdown(60); // 60 seconds countdown
      Alert.alert(
        t('login.codeSent') || '验证码已发送',
        t('login.codeSentMessage') || '验证码已发送到您的手机，请在5分钟内输入。'
      );
    } else {
      setError(result.message || t('login.sendCodeFailed') || '发送验证码失败');
    }
  };

  /**
   * Handle login
   */
  const handleLogin = async () => {
    if (!code || code.length !== 6) {
      setError(t('login.invalidCode') || '请输入6位验证码');
      return;
    }

    setLoading(true);
    setError(null);

    // Normalize phone number before login
    const digits = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = '+1' + digits;
    const result = await login(normalizedPhone, code);

    setLoading(false);

    if (result.success) {
      // Navigation will happen automatically via useEffect when isAuthenticated changes
      router.replace('/meeting');
    } else {
      setError(result.message || t('login.loginFailed') || '登录失败');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.content}>
          {/* App Title */}
          <View style={styles.appTitleContainer}>
            <Text
              style={[
                styles.appTitle,
                { color: colors.text, fontSize: getFontSizeValue(24) },
              ]}>
              Church in Cerritos
            </Text>
          </View>

          {/* Logo/Title */}
          <View style={styles.header}>
            <Ionicons name="lock-closed" size={64} color={colors.primary} />
            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: getFontSizeValue(28) },
              ]}>
              {t('login.title') || '登录'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.textSecondary,
                  fontSize: getFontSizeValue(14),
                },
              ]}>
              {t('login.subtitle') || '请输入您的手机号以继续'}
            </Text>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontSize: getFontSizeValue(14) },
              ]}>
              {t('login.phoneNumber') || '手机号'}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: error ? colors.error : colors.border,
                },
              ]}>
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={phoneInputRef}
                style={[
                  styles.input,
                  { color: colors.text, fontSize: getFontSizeValue(16) },
                ]}
                placeholder={t('login.phonePlaceholder') || '(123) 456-7890'}
                placeholderTextColor={colors.textTertiary}
                value={formatPhoneDisplay(phoneNumber)}
                onChangeText={(text) => {
                  // Remove all non-digit characters
                  const digits = text.replace(/\D/g, '');
                  // Limit to 10 digits for US phone numbers
                  const limitedDigits = digits.slice(0, 10);
                  setPhoneNumber(limitedDigits);
                  if (phoneWhitelisted === false) {
                    setError(null);
                    setPhoneWhitelisted(null);
                  }
                }}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                  }, 100);
                }}
                onBlur={() => {
                  if (phoneNumber.replace(/\D/g, '').length >= 10) {
                    checkPhoneWhitelist(phoneNumber);
                  }
                }}
                keyboardType="number-pad"
                autoComplete="tel"
                editable={countdown === 0}
              />
              {checkingPhone && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.checkingIndicator}
                />
              )}
              {phoneWhitelisted === true && !checkingPhone && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                  style={styles.checkIcon}
                />
              )}
              {phoneWhitelisted === false && !checkingPhone && (
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.error}
                  style={styles.checkIcon}
                />
              )}
            </View>
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[
              styles.sendCodeButton,
              {
                backgroundColor:
                  countdown > 0 ||
                  sendingCode ||
                  !phoneNumber ||
                  phoneWhitelisted === false
                    ? colors.textTertiary
                    : colors.primary,
              },
            ]}
            onPress={handleSendCode}
            disabled={
              countdown > 0 ||
              sendingCode ||
              !phoneNumber ||
              phoneWhitelisted === false
            }
            activeOpacity={0.7}>
            {sendingCode ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendCodeButtonText}>
                {countdown > 0
                  ? `${t('login.resendIn') || '重新发送'} (${countdown}s)`
                  : t('login.sendCode') || '发送验证码'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <Text
            style={[
              styles.helpText,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(12),
              },
            ]}>
            {t('login.helpText') || '如果您无法收到验证码，请联系负责弟兄'}
          </Text>

          {/* Development Mode Hint */}
          {__DEV__ && countdown > 0 && (
            <Text
              style={[
                styles.devHint,
                {
                  color: colors.primary,
                  fontSize: getFontSizeValue(12),
                },
              ]}>
              开发模式：验证码为 123456
            </Text>
          )}

          {/* Verification Code Input */}
          {countdown > 0 && (
            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.label,
                  { color: colors.text, fontSize: getFontSizeValue(14) },
                ]}>
                {t('login.verificationCode') || '验证码'}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}>
                <Ionicons
                  name="keypad-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={codeInputRef}
                  style={[
                    styles.input,
                    { color: colors.text, fontSize: getFontSizeValue(16) },
                  ]}
                  placeholder={t('login.codePlaceholder') || '请输入6位验证码'}
                  placeholderTextColor={colors.textTertiary}
                  value={code}
                  onChangeText={(text) => {
                    // Only allow 6 digits
                    const digits = text.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                    }, 100);
                  }}
                />
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text
                style={[
                  styles.errorText,
                  { color: colors.error, fontSize: getFontSizeValue(14) },
                ]}>
                {error}
              </Text>
            </View>
          )}

          {/* Login Button */}
          {countdown > 0 && (
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor:
                    loading || !code || code.length !== 6
                      ? colors.textTertiary
                      : colors.primary,
                },
              ]}
              onPress={handleLogin}
              disabled={loading || !code || code.length !== 6}
              activeOpacity={0.7}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {t('login.login') || '登录'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          </View>
        </ScrollView>

        {/* Language Switcher */}
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              {
                backgroundColor:
                  i18n.resolvedLanguage === 'zh' ? colors.primary : colors.card,
                borderColor: colors.border,
                marginHorizontal: 6,
              },
            ]}
            onPress={() => setAppLanguage('zh')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.languageButtonText,
                {
                  color:
                    i18n.resolvedLanguage === 'zh' ? '#fff' : colors.text,
                  fontSize: getFontSizeValue(14),
                },
              ]}>
              简体中文
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              {
                backgroundColor:
                  i18n.resolvedLanguage === 'zh-Hant'
                    ? colors.primary
                    : colors.card,
                borderColor: colors.border,
                marginHorizontal: 6,
              },
            ]}
            onPress={() => setAppLanguage('zh-Hant')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.languageButtonText,
                {
                  color:
                    i18n.resolvedLanguage === 'zh-Hant' ? '#fff' : colors.text,
                  fontSize: getFontSizeValue(14),
                },
              ]}>
              繁體中文
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'flex-start',
  },
  appTitleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 30,
  },
  checkingIndicator: {
    marginLeft: 8,
    position: 'absolute',
    right: 16,
  },
  checkIcon: {
    marginLeft: 8,
    position: 'absolute',
    right: 16,
  },
  sendCodeButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sendCodeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  devHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '600',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
