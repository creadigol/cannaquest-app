import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme/tokens';
import { PrescriptionsScreenContent } from '@/features/prescriptions/components/PrescriptionsScreenContent';

export default function ScriptsTabScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <PrescriptionsScreenContent />
    </SafeAreaView>
  );
}
