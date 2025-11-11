import { api } from '../services/api';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Global crash reporter utility
 * Handles unhandled promise rejections and other global errors
 */

let isInitialized = false;
let userActions: string[] = [];
let currentScreen: string = 'unknown';

/**
 * Initialize global error handlers
 */
export function initializeCrashReporter() {
  if (isInitialized) return;
  isInitialized = true;

  // Track user actions (last 20 actions)
  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('[Navigation]') || message.includes('[Screen]')) {
      const screenMatch = message.match(/\[Screen\]\s*(.+)/);
      if (screenMatch) {
        currentScreen = screenMatch[1];
      }
    }
    originalConsoleLog(...args);
  };

  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: PromiseRejectionEvent) => {
      console.error('[CrashReporter] Unhandled promise rejection:', event.reason);
      
      reportCrash({
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        errorInfo: null,
        isUnhandledRejection: true,
      });

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(event);
      }
    };
  }

  // Handle JavaScript errors (for web)
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('[CrashReporter] Global error:', event.error);
      
      reportCrash({
        error: event.error || new Error(event.message || 'Unknown error'),
        errorInfo: {
          componentStack: event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : null,
        },
        isUnhandledRejection: false,
      });
    });
  }
}

/**
 * Report a crash to the server
 */
async function reportCrash({
  error,
  errorInfo,
  isUnhandledRejection = false,
}: {
  error: Error;
  errorInfo: any;
  isUnhandledRejection?: boolean;
}) {
  try {
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: Platform.isTV === false && Platform.isPad === false,
    };

    await api.reportCrash({
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || null,
      errorName: error.name || 'Error',
      deviceInfo,
      appVersion: Constants.expoConfig?.version || Constants.manifest?.version || 'unknown',
      osVersion: Platform.Version?.toString() || 'unknown',
      platform: Platform.OS || 'unknown',
      screenName: currentScreen,
      userActions: userActions.length > 0 ? userActions.slice(-10) : null, // Last 10 actions
      additionalData: {
        componentStack: errorInfo?.componentStack || null,
        isUnhandledRejection,
        updateId: Updates.updateId || null,
        channel: Updates.channel || null,
      },
    });
  } catch (reportError) {
    console.error('[CrashReporter] Failed to report crash:', reportError);
  }
}

/**
 * Track user action (for crash context)
 */
export function trackUserAction(action: string) {
  userActions.push(`${new Date().toISOString()}: ${action}`);
  // Keep only last 20 actions
  if (userActions.length > 20) {
    userActions = userActions.slice(-20);
  }
}

/**
 * Set current screen name
 */
export function setCurrentScreen(screenName: string) {
  currentScreen = screenName;
}

/**
 * Manually report an error
 */
export async function reportError(error: Error, errorInfo?: any) {
  await reportCrash({
    error,
    errorInfo: errorInfo || null,
    isUnhandledRejection: false,
  });
}

