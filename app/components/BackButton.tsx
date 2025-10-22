// app/src/components/BackButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';

export default function BackButton() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ paddingHorizontal: 12 }}>
      <Ionicons name='chevron-back' size={24} color={colors.text} />
    </TouchableOpacity>
  );
}
