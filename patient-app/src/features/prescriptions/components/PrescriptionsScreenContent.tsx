import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { brandLabel, colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import type { Prescription } from '../api/prescriptions.types';
import { fetchPrescriptions } from '../api/prescriptions.api';
import { PrescriptionsHeaderBanner } from './PrescriptionsHeaderBanner';
import { PrescriptionCard } from './PrescriptionCard';
import { SelectPrescriberModal } from './SelectPrescriberModal';
import { UploadPrescriptionModal } from './UploadPrescriptionModal';
import { addToCart, useCart } from '@/features/cart';

const GROUP_CONFIG = [
  { group: 'ready', title: 'Ready to Order' },
  { group: 'refill_soon', title: 'Refill Coming Soon' },
  { group: 'pending', title: 'Pending Review' },
  { group: 'attention', title: 'Needs Attention' },
] as const;

export function PrescriptionsScreenContent() {
  const { refreshCart } = useCart();
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [counts, setCounts] = useState({ current: 0, past: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [prescriberModalVisible, setPrescriberModalVisible] = useState(false);
  const [selectedScriptForPrescriber, setSelectedScriptForPrescriber] = useState<Prescription | null>(null);

  const loadPrescriptions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await fetchPrescriptions(activeTab, searchQuery);
        setPrescriptions(data.prescriptions);
        setCounts(data.counts);
      } catch (err: any) {
        setError(err?.message || 'Failed to load prescriptions.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, searchQuery]
  );

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleAddToCart = async (prescriptionId: string) => {
    console.log('[USER ACTION] Add to cart pressed for script:', prescriptionId);
    try {
      const rx = prescriptions.find((p) => String(p.id) === String(prescriptionId));
      const productId = rx?.productId ?? prescriptionId;
      await addToCart({
        productId,
        prescriptionId: Number(prescriptionId),
        source: 'prescription',
      });
      await refreshCart();
      Alert.alert('Added to Cart', 'Prescription medication added to your cart.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Could not add to cart.');
    }
  };

  const handleSelectPrescriber = (prescription: Prescription) => {
    setSelectedScriptForPrescriber(prescription);
    setPrescriberModalVisible(true);
  };

  const handleViewOrder = (orderUuid: string) => {
    console.log('[USER ACTION] View order pressed for uuid:', orderUuid);
  };

  // Grouped sections for current tab
  const renderSections = () => {
    if (prescriptions.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconText}>💊</Text>
          </View>
          <Text style={styles.emptyTitle}>
            No {activeTab} prescriptions found
          </Text>
          <Text style={styles.emptySub}>
            {searchQuery
              ? `No prescriptions match "${searchQuery}".`
              : 'Your prescribed medical treatments will appear here once issued by your doctor.'}
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/consults')}
            style={({ pressed }) => [styles.emptyBookBtn, pressed && styles.pressed]}
          >
            <Text style={styles.emptyBookBtnText}>Book a Consultation</Text>
          </Pressable>
        </View>
      );
    }

    if (activeTab === 'past') {
      return (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>PAST PRESCRIPTIONS ({prescriptions.length})</Text>
          {prescriptions.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              prescription={rx}
              onAddToCart={handleAddToCart}
              onSelectPrescriber={handleSelectPrescriber}
              onViewOrder={handleViewOrder}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.sectionsContainer}>
        {GROUP_CONFIG.map(({ group, title }) => {
          const groupItems = prescriptions.filter((p) => p.group === group);
          if (groupItems.length === 0) return null;

          return (
            <View key={group} style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>
                {title.toUpperCase()} ({groupItems.length})
              </Text>
              {groupItems.map((rx) => (
                <PrescriptionCard
                  key={rx.id}
                  prescription={rx}
                  onAddToCart={handleAddToCart}
                  onSelectPrescriber={handleSelectPrescriber}
                  onViewOrder={handleViewOrder}
                />
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[1]}
        keyExtractor={() => 'scripts-content'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPrescriptions(true)}
            tintColor={colors.primaryGreen}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={() => (
          <View>
            {/* 1. Header Banner */}
            <PrescriptionsHeaderBanner
              onUploadPress={() => setUploadModalVisible(true)}
            />

            {/* 2. Tabs Row */}
            <View style={styles.tabsRow}>
              <View style={styles.tabsPills}>
                <Pressable
                  onPress={() => setActiveTab('current')}
                  style={[
                    styles.tabPill,
                    activeTab === 'current' && styles.tabPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      activeTab === 'current' && styles.tabPillTextActive,
                    ]}
                  >
                    Current {counts.current > 0 ? `(${counts.current})` : ''}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('past')}
                  style={[
                    styles.tabPill,
                    activeTab === 'past' && styles.tabPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      activeTab === 'past' && styles.tabPillTextActive,
                    ]}
                  >
                    Past {counts.past > 0 ? `(${counts.past})` : ''}
                  </Text>
                </Pressable>
              </View>

              {/* Search Box */}
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  placeholder="Search scripts..."
                  placeholderTextColor={colors.gray400}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="words"
                  autoCorrect={true}
                  style={styles.searchInput}
                />
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => loadPrescriptions()} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {/* 3. Loading or Content */}
            {loading && !refreshing ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.primaryGreen} size="large" />
                <Text style={styles.loadingLabel}>Loading prescriptions...</Text>
              </View>
            ) : (
              renderSections()
            )}
          </View>
        )}
      />

      {/* Upload Script Modal */}
      <UploadPrescriptionModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={() => loadPrescriptions(true)}
      />

      {/* Select Prescriber Modal */}
      <SelectPrescriberModal
        visible={prescriberModalVisible}
        prescription={selectedScriptForPrescriber}
        onClose={() => {
          setPrescriberModalVisible(false);
          setSelectedScriptForPrescriber(null);
        }}
        onSuccess={() => loadPrescriptions(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  tabsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabsPills: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: radii.full,
    flexDirection: 'row',
    padding: 3,
  },
  tabPill: {
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabPillActive: {
    backgroundColor: '#ffffff',
    ...shadows.tier1,
  },
  tabPillText: {
    color: colors.mutedForeground,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: colors.primaryGreen,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: radii.full,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 13,
  },
  searchInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 12,
    height: '100%',
    padding: 0,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryBtnText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  loaderWrap: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingLabel: {
    color: colors.mutedForeground,
    fontSize: 13,
  },
  sectionsContainer: {
    gap: 8,
  },
  sectionWrap: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.gray500,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xxl,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: 32,
    textAlign: 'center',
    ...shadows.tier1,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(14, 48, 23, 0.06)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 14,
    width: 56,
  },
  emptyIconText: {
    fontSize: 26,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  emptyBookBtn: {
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.xl,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBookBtnText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
