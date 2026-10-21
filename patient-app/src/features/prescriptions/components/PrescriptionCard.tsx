import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';
import type { Prescription } from '../api/prescriptions.types';
import { RepeatsTimeline } from './RepeatsTimeline';

// Category fallback images
const CATEGORY_IMAGES: Record<string, any> = {
  flower: require('../../../../assets/images/product-categories/jar.webp'),
  capsule: require('../../../../assets/images/product-categories/jar.webp'),
  edible: require('../../../../assets/images/product-categories/edible.webp'),
  oil: require('../../../../assets/images/product-categories/oil.webp'),
  vape: require('../../../../assets/images/product-categories/oil.webp'),
  cartridge: require('../../../../assets/images/product-categories/oil.webp'),
  device: require('../../../../assets/images/product-categories/device.webp'),
};

function getScriptImageSource(prescription: Prescription): any {
  if (prescription.imageUrl && prescription.imageUrl.trim().length > 0) {
    return { uri: prescription.imageUrl };
  }
  const formKey = (prescription.productForm || '').toLowerCase();
  for (const [key, asset] of Object.entries(CATEGORY_IMAGES)) {
    if (formKey.includes(key)) {
      return asset;
    }
  }
  return CATEGORY_IMAGES.flower;
}

type Props = {
  prescription: Prescription;
  onAddToCart?: (prescriptionId: string) => void;
  onSelectPrescriber?: (prescription: Prescription) => void;
  onViewOrder?: (orderUuid: string) => void;
};

export function PrescriptionCard({
  prescription,
  onAddToCart,
  onSelectPrescriber,
  onViewOrder,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const imageSource = getScriptImageSource(prescription);

  // Status badge styling
  const isApproved =
    prescription.statusColor === 'emerald' ||
    prescription.status === 'APPROVED' ||
    prescription.status === 'ASSIGNED';
  const isUnderReview = prescription.statusColor === 'amber';
  const isActionRequired = prescription.statusColor === 'red';

  const badgeBg = isApproved
    ? colors.emeraldChipBg
    : isUnderReview
    ? '#fef3c7'
    : isActionRequired
    ? '#fee2e2'
    : '#f3f4f6';
  const badgeText = isApproved
    ? colors.emeraldChipText
    : isUnderReview
    ? '#b45309'
    : isActionRequired
    ? '#b91c1c'
    : '#4b5563';

  // Format expiry date
  const formattedExpiry = prescription.expiryDate
    ? new Date(prescription.expiryDate).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {/* Product Row */}
        <View style={styles.productRow}>
          {/* Thumbnail */}
          <View style={styles.imageWrap}>
            <Image source={imageSource} style={styles.thumbnail} resizeMode="contain" />
          </View>

          {/* Info Column */}
          <View style={styles.infoCol}>
            <Text numberOfLines={2} style={styles.productName}>
              {prescription.productName || 'Prescribed Medication'}
            </Text>

            <View style={styles.metaRow}>
              {prescription.manufacturer ? (
                <Text numberOfLines={1} style={styles.metaText}>
                  {prescription.manufacturer}
                </Text>
              ) : null}
              {prescription.productForm ? (
                <View style={styles.formChip}>
                  <Text style={styles.formChipText}>{prescription.productForm}</Text>
                </View>
              ) : null}
            </View>

            {prescription.strength ? (
              <View style={styles.strengthChip}>
                <Text style={styles.strengthChipText}>{prescription.strength}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Status & Expiry Bar */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>
              {prescription.statusLabel}
            </Text>
          </View>
          {formattedExpiry ? (
            <Text style={styles.expiryText}>Exp: {formattedExpiry}</Text>
          ) : null}
        </View>

        {/* Prescriber selection prompt if required */}
        {prescription.requiresPrescriberSelection ? (
          <Pressable
            onPress={() => onSelectPrescriber?.(prescription)}
            style={({ pressed }) => [styles.prescriberPrompt, pressed && styles.pressed]}
          >
            <View style={styles.prescriberPromptTextCol}>
              <Text style={styles.prescriberPromptTitle}>Choose Your Prescriber</Text>
              <Text style={styles.prescriberPromptSub}>
                Select from doctors you’ve consulted with to begin review.
              </Text>
            </View>
            <Text style={styles.prescriberPromptAction}>Select ›</Text>
          </Pressable>
        ) : prescription.prescriberName ? (
          <View style={styles.prescriberTag}>
            <Text style={styles.prescriberLabel}>Prescriber:</Text>
            <Text style={styles.prescriberValue}>
              {prescription.prescriberName.startsWith('Dr')
                ? prescription.prescriberName
                : `Dr. ${prescription.prescriberName}`}
            </Text>
          </View>
        ) : null}

        {/* Repeats Timeline */}
        <RepeatsTimeline
          repeatTimes={prescription.repeatTimes}
          repeatsFilled={prescription.repeatsFilled}
          remainingRepeats={prescription.remainingRepeats}
          intervalDays={prescription.intervalDays}
          createdAt={prescription.createdAt}
        />

        {/* Interval restriction alert */}
        {prescription.isIntervalRestricted && !prescription.allRepeatsUsed ? (
          <View style={styles.intervalAlert}>
            <Text style={styles.intervalAlertText}>
              Next refill available {prescription.nextAvailableDate ? `around ${new Date(prescription.nextAvailableDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : 'after interval period'}
            </Text>
          </View>
        ) : null}

        {/* Action Row */}
        <View style={styles.actionBar}>
          {prescription.canOrder && prescription.unitPrice != null ? (
            <Text style={styles.price}>${prescription.unitPrice.toFixed(2)}</Text>
          ) : (
            <View />
          )}

          <View style={styles.btnGroup}>
            {/* View active order if tied to one */}
            {prescription.latestActiveOrderUuid ? (
              <Pressable
                onPress={() => onViewOrder?.(prescription.latestActiveOrderUuid!)}
                style={({ pressed }) => [styles.viewOrderBtn, pressed && styles.pressed]}
              >
                <Text style={styles.viewOrderBtnText}>📦 View Order</Text>
              </Pressable>
            ) : null}

            {/* Main CTA */}
            {prescription.canOrder ? (
              <Pressable
                onPress={() => onAddToCart?.(prescription.id)}
                style={({ pressed }) => [styles.orderBtn, pressed && styles.pressed]}
              >
                <Text style={styles.orderBtnText}>🛒 Add to Cart</Text>
              </Pressable>
            ) : prescription.requiresPrescriberSelection ? (
              <Pressable
                onPress={() => onSelectPrescriber?.(prescription)}
                style={({ pressed }) => [styles.prescriberSelectBtn, pressed && styles.pressed]}
              >
                <Text style={styles.prescriberSelectBtnText}>Select Prescriber</Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.ctaDisabledBadge,
                  prescription.group === 'attention' && styles.ctaAttentionBadge,
                ]}
              >
                <Text
                  style={[
                    styles.ctaDisabledText,
                    prescription.group === 'attention' && styles.ctaAttentionText,
                  ]}
                >
                  {prescription.ctaLabel}
                </Text>
              </View>
            )}

            {/* Expand / Collapse toggle */}
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={({ pressed }) => [styles.chevronToggle, pressed && styles.pressed]}
            >
              <Text style={styles.chevronIcon}>{expanded ? '▲' : '▼'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Collapsible Details Panel */}
        {expanded ? (
          <View style={styles.detailsPanel}>
            {prescription.packageSize ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Package Size</Text>
                <Text style={styles.detailValue}>{prescription.packageSize}</Text>
              </View>
            ) : null}

            {prescription.erxToken ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>eRx Token</Text>
                <Text style={styles.detailValueMono}>{prescription.erxToken}</Text>
              </View>
            ) : null}

            {prescription.adminNote ? (
              <View style={styles.adminNoteBox}>
                <Text style={styles.adminNoteLabel}>Reviewer Note:</Text>
                <Text style={styles.adminNoteText}>{prescription.adminNote}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.07)',
    borderRadius: radii.xl,
    borderWidth: 1,
    elevation: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  inner: {
    padding: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  thumbnail: {
    height: '85%',
    width: '85%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    color: colors.gray500,
    fontSize: 11,
  },
  formChip: {
    backgroundColor: 'rgba(14, 48, 23, 0.07)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  formChipText: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  strengthChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  strengthChipText: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: '800',
  },
  expiryText: {
    color: colors.gray400,
    fontSize: 11,
  },
  prescriberPrompt: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  prescriberPromptTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  prescriberPromptTitle: {
    color: '#1d4ed8',
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  prescriberPromptSub: {
    color: '#3b82f6',
    fontSize: 10,
    marginTop: 1,
  },
  prescriberPromptAction: {
    color: '#1d4ed8',
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: '800',
  },
  prescriberTag: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  prescriberLabel: {
    color: colors.gray500,
    fontSize: 11,
  },
  prescriberValue: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  intervalAlert: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  intervalAlertText: {
    color: '#b45309',
    fontFamily: typography.medium,
    fontSize: 10,
  },
  actionBar: {
    alignItems: 'center',
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
  },
  price: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 16,
    fontWeight: '800',
  },
  btnGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  viewOrderBtn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewOrderBtnText: {
    color: '#b45309',
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  orderBtn: {
    backgroundColor: colors.accentLime,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  orderBtnText: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: '800',
  },
  prescriberSelectBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  prescriberSelectBtnText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  ctaDisabledBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaDisabledText: {
    color: colors.gray500,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  ctaAttentionBadge: {
    backgroundColor: '#fef2f2',
  },
  ctaAttentionText: {
    color: '#dc2626',
  },
  chevronToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: radii.md,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  chevronIcon: {
    color: colors.gray500,
    fontSize: 10,
  },
  detailsPanel: {
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    color: colors.gray400,
    fontSize: 11,
  },
  detailValue: {
    color: colors.foreground,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  detailValueMono: {
    color: colors.gray500,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
  },
  adminNoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    marginTop: 6,
    padding: 6,
  },
  adminNoteLabel: {
    color: colors.gray500,
    fontFamily: typography.bold,
    fontSize: 10,
  },
  adminNoteText: {
    color: colors.foreground,
    fontSize: 11,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
