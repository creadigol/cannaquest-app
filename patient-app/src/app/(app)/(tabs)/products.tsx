import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme/tokens';
import { ProductsScreenContent } from '@/features/products/components/ProductsScreenContent';

export default function ProductsTabScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ProductsScreenContent />
    </SafeAreaView>
  );
}
