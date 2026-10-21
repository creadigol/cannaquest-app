import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import type { Product } from '../api/product.types';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onBookConsultation?: () => void;
}

const CATEGORY_IMAGES: Record<string, any> = {
  flower: require('../../../../assets/images/product-categories/jar.webp'),
  capsule: require('../../../../assets/images/product-categories/jar.webp'),
  edible: require('../../../../assets/images/product-categories/edible.webp'),
  oil: require('../../../../assets/images/product-categories/oil.webp'),
  vape: require('../../../../assets/images/product-categories/oil.webp'),
  cartridge: require('../../../../assets/images/product-categories/oil.webp'),
  device: require('../../../../assets/images/product-categories/device.webp'),
};

import { getS3PresignedUrl } from '@/features/customer/api/s3ComplianceService';

const S3_BUCKET_URL = 'https://cannaquest-storage.s3.ap-southeast-2.amazonaws.com';

function getProductImageSource(product: Product): { uri: string } | any {
  const rawUrl = product.image_url ?? product.imageUrl ?? product.image;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { uri: getS3PresignedUrl(trimmed) };
    }
    const cleanKey = trimmed.replace(/^\/+/, '');
    return { uri: getS3PresignedUrl(`${S3_BUCKET_URL}/${cleanKey}`) };
  }

  const formKey = (
    product.form ||
    product.category ||
    (product.isAddonDevice || product.is_addon_device ? 'device' : '') ||
    ''
  ).toLowerCase().trim();

  for (const [key, asset] of Object.entries(CATEGORY_IMAGES)) {
    if (formKey.includes(key)) {
      return asset;
    }
  }

  return CATEGORY_IMAGES.flower;
}

export function ProductDetailModal({
  product,
  visible,
  onClose,
  onAddToCart,
  onBookConsultation,
}: Props) {
  if (!product) return null;

  const isPrescribed = Boolean(product.prescribed || product.can_purchase);
  const needsRenewal = Boolean(product.needs_renewal && !isPrescribed);
  const isInStock = product.in_stock ?? product.inStock ?? true;
  const imageSource = getProductImageSource(product);

  const price = (
    product.unitPrice ??
    product.unit_price ??
    product.retailPrice ??
    product.retail_price ??
    product.price ??
    0
  );

  const isDevice = Boolean(product.isAddonDevice || product.is_addon_device || (product.category || '').toLowerCase().includes('device'));

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={10}>
            <Text style={styles.backButtonText}>✕ Close</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Hero Card with Image & Badges */}
          <View style={styles.imageCard}>
            <View style={styles.imageWrap}>
              <Image source={imageSource} style={styles.productImage} resizeMode="contain" />

              {/* Floating Badges */}
              <View style={styles.floatingTopLeft}>
                {product.thcContent || product.thc_content ? (
                  <View style={[styles.pillBadge, styles.thcBadge]}>
                    <Text style={styles.thcBadgeText}>
                      THC {product.thcContent ?? product.thc_content}
                    </Text>
                  </View>
                ) : null}
                {product.cbdContent || product.cbd_content ? (
                  <View style={[styles.pillBadge, styles.cbdBadge]}>
                    <Text style={styles.cbdBadgeText}>
                      CBD {product.cbdContent ?? product.cbd_content}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Stock & Prescription Badge */}
              <View style={styles.floatingTopRight}>
                <View
                  style={[
                    styles.stockBadge,
                    isInStock ? styles.stockInBadge : styles.stockOutBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.stockDot,
                      isInStock ? styles.stockInDot : styles.stockOutDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stockText,
                      isInStock ? styles.stockInText : styles.stockOutText,
                    ]}
                  >
                    {isInStock ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>

                {isPrescribed ? (
                  <View style={[styles.pillBadge, styles.prescribedBadge]}>
                    <Text style={styles.prescribedBadgeText}>✓ Prescribed</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Product Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.rangeLabel}>PRODUCT RANGE</Text>
            <Text style={styles.productName}>{product.name}</Text>
            {product.manufacturer ? (
              <Text style={styles.manufacturer}>{product.manufacturer}</Text>
            ) : null}

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>${price.toFixed(2)}</Text>
              <View
                style={[
                  styles.stockBadgeInline,
                  isInStock ? styles.stockInBadge : styles.stockOutBadge,
                ]}
              >
                <Text
                  style={[
                    styles.stockText,
                    isInStock ? styles.stockInText : styles.stockOutText,
                  ]}
                >
                  {isInStock ? '● Ready to dispatch' : '● Currently unavailable'}
                </Text>
              </View>
            </View>

            {product.description ? (
              <Text style={styles.description}>{product.description}</Text>
            ) : null}
          </View>

          {/* Potency Indicator Cards */}
          {(product.thcContent || product.thc_content || product.cbdContent || product.cbd_content) ? (
            <View style={styles.potencyRow}>
              {product.thcContent || product.thc_content ? (
                <View style={styles.potencyCard}>
                  <Text style={styles.potencyLabel}>THC (% / mg)</Text>
                  <Text style={styles.potencyValue}>
                    {product.thcContent ?? product.thc_content}
                  </Text>
                </View>
              ) : null}
              {product.cbdContent || product.cbd_content ? (
                <View style={styles.potencyCard}>
                  <Text style={styles.potencyLabel}>CBD (% / mg)</Text>
                  <Text style={styles.potencyValue}>
                    {product.cbdContent ?? product.cbd_content}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Product Specifications Table */}
          <View style={styles.specCard}>
            <Text style={styles.specTitle}>PRODUCT SPECIFICATIONS</Text>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Stock Status</Text>
              <Text
                style={[
                  styles.specValue,
                  { color: isInStock ? colors.primaryGreen : colors.destructive, fontWeight: '700' },
                ]}
              >
                {isInStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Form</Text>
              <Text style={styles.specValue}>
                {product.form || product.category || (isDevice ? 'Device / Vaporiser' : 'Medication')}
              </Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>THC Content</Text>
              <Text style={styles.specValue}>
                {product.thcContent ?? product.thc_content ? `${product.thcContent ?? product.thc_content}` : (isDevice ? 'N/A (Accessory)' : '—')}
              </Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>CBD Content</Text>
              <Text style={styles.specValue}>
                {product.cbdContent ?? product.cbd_content ? `${product.cbdContent ?? product.cbd_content}` : (isDevice ? 'N/A (Accessory)' : '—')}
              </Text>
            </View>

            {product.package_size || product.packageSize ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Package Size</Text>
                <Text style={styles.specValue}>
                  {product.package_size || product.packageSize}
                </Text>
              </View>
            ) : null}

            {product.strength ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Strength</Text>
                <Text style={styles.specValue}>{product.strength}</Text>
              </View>
            ) : null}

            {product.dosage ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Dosage</Text>
                <Text style={styles.specValue}>{product.dosage}</Text>
              </View>
            ) : null}
          </View>

          {/* Compliance notice for devices */}
          {isDevice ? (
            <View style={styles.deviceNoticeCard}>
              <Text style={styles.deviceNoticeTitle}>MEDICAL DEVICE COMPLIANCE</Text>
              <View style={styles.noticeList}>
                <Text style={styles.noticeItem}>
                  1. This device is intended solely for use with prescribed medications.
                </Text>
                <Text style={styles.noticeItem}>
                  2. Medicinal cannabis is a prescription medicine. Consult your healthcare professional.
                </Text>
                <Text style={styles.noticeItem}>
                  3. You must be 18 years or older to purchase this device.
                </Text>
                <Text style={styles.noticeItem}>
                  4. Not intended for use with tobacco, tobacco products, or nicotine.
                </Text>
                <Text style={styles.noticeItem}>
                  5. Always read the label and follow the directions for use.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Sticky Action Bar */}
        <View style={styles.bottomBar}>
          {isInStock ? (
            isPrescribed || isDevice ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onAddToCart?.(product);
                }}
                style={({ pressed }) => [styles.actionButton, styles.addButton, pressed && styles.pressed]}
              >
                <Text style={styles.addButtonText}>+ Add to Cart • ${price.toFixed(2)}</Text>
              </Pressable>
            ) : needsRenewal ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onBookConsultation?.();
                }}
                style={({ pressed }) => [styles.actionButton, styles.consultButton, pressed && styles.pressed]}
              >
                <Text style={styles.consultButtonText}>Renew Prescription • Book Consult</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  onClose();
                  onAddToCart?.(product);
                }}
                style={({ pressed }) => [styles.actionButton, styles.addButton, pressed && styles.pressed]}
              >
                <Text style={styles.addButtonText}>+ Add to Cart • ${price.toFixed(2)}</Text>
              </Pressable>
            )
          ) : (
            <View style={[styles.actionButton, styles.outOfStockButton]}>
              <Text style={styles.outOfStockButtonText}>Currently Out of Stock</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  backButtonText: {
    color: colors.primaryGreen,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  headerTitle: {
    color: colors.foreground,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 100,
  },
  imageCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.tier1,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    height: 280,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  productImage: {
    height: '80%',
    width: '80%',
  },
  floatingTopLeft: {
    flexDirection: 'row',
    gap: spacing.xs,
    left: spacing.md,
    position: 'absolute',
    top: spacing.md,
  },
  floatingTopRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  pillBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  thcBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  thcBadgeText: {
    color: '#b45309',
    fontFamily: typography.bold,
    fontSize: 11,
  },
  cbdBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  cbdBadgeText: {
    color: '#1d4ed8',
    fontFamily: typography.bold,
    fontSize: 11,
  },
  prescribedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  prescribedBadgeText: {
    color: '#16a34a',
    fontFamily: typography.bold,
    fontSize: 11,
  },
  stockBadge: {
    alignItems: 'center',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockInBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  stockOutBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  stockDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  stockInDot: {
    backgroundColor: '#16a34a',
  },
  stockOutDot: {
    backgroundColor: '#dc2626',
  },
  stockText: {
    fontFamily: typography.bold,
    fontSize: 11,
  },
  stockInText: {
    color: '#16a34a',
  },
  stockOutText: {
    color: '#dc2626',
  },
  stockBadgeInline: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: spacing.lg,
    ...shadows.tier1,
  },
  rangeLabel: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  productName: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  manufacturer: {
    color: colors.mutedForeground,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 6,
  },
  priceText: {
    color: colors.primaryGreen,
    fontFamily: typography.extraBold,
    fontSize: 28,
  },
  description: {
    color: colors.foreground,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  potencyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  potencyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
    ...shadows.tier1,
  },
  potencyLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  potencyValue: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 18,
    marginTop: 4,
  },
  specCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 12,
    padding: spacing.lg,
    ...shadows.tier1,
  },
  specTitle: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  specRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  specLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  specValue: {
    color: colors.foreground,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  deviceNoticeCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 10,
    padding: spacing.lg,
  },
  deviceNoticeTitle: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  noticeList: {
    gap: 8,
  },
  noticeItem: {
    color: colors.foreground,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    ...shadows.tier2,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radii.lg,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addButton: {
    backgroundColor: colors.accentLime,
  },
  addButtonText: {
    color: '#064e3b',
    fontFamily: typography.bold,
    fontSize: 15,
  },
  consultButton: {
    backgroundColor: colors.primaryGreen,
  },
  consultButtonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  outOfStockButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  outOfStockButtonText: {
    color: colors.mutedForeground,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
