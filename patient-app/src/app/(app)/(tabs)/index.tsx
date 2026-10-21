import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreenContent } from '@/features/dashboard/components/HomeScreenContent';
import { colors } from '@/lib/theme/tokens';

export default function HomeTabScreen() {
    return (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
            <HomeScreenContent />
        </SafeAreaView>
    );
}
