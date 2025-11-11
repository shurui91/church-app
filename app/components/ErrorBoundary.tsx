import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { api } from '../src/services/api';
import Constants from 'expo-constants';
import { useThemeColors } from '../src/hooks/useThemeColors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private userActions: string[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report crash to server
    this.reportCrash(error, errorInfo);
  }

  private async reportCrash(error: Error, errorInfo: ErrorInfo) {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        isDevice: Platform.isTV === false && Platform.isPad === false,
      };

      await api.reportCrash({
        errorMessage: error.message || 'Unknown error',
        errorStack: error.stack || errorInfo.componentStack,
        errorName: error.name || 'Error',
        deviceInfo,
        appVersion: Constants.expoConfig?.version || Constants.manifest?.version || 'unknown',
        osVersion: Platform.Version?.toString() || 'unknown',
        platform: Platform.OS || 'unknown',
        screenName: errorInfo.componentStack?.split('\n')[1]?.trim() || 'unknown',
        userActions: this.userActions.length > 0 ? this.userActions.slice(-10) : null, // Last 10 actions
        additionalData: {
          componentStack: errorInfo.componentStack,
        },
      });
    } catch (reportError) {
      console.error('[ErrorBoundary] Failed to report crash:', reportError);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.userActions = [];
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, errorInfo, onReset }: { error: Error | null; errorInfo: ErrorInfo | null; onReset: () => void }) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>应用出现错误</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          很抱歉，应用遇到了一个错误。错误信息已自动上报，我们会尽快修复。
        </Text>
        
        {__DEV__ && error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>错误详情（仅开发模式）:</Text>
            <Text style={[styles.errorText, { color: colors.text }]}>{error.toString()}</Text>
            {error.stack && (
              <Text style={[styles.errorStack, { color: colors.textSecondary }]}>{error.stack}</Text>
            )}
            {errorInfo?.componentStack && (
              <Text style={[styles.errorStack, { color: colors.textSecondary }]}>
                {errorInfo.componentStack}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onReset}
        >
          <Text style={styles.buttonText}>重试</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Export as a functional component wrapper
export default function ErrorBoundary({ children, fallback }: Props) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

