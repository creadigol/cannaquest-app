import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';
import type { Product } from '../api/product.types';

type Props = {
  product: Product;
  onPress?: () => void;
  onAddToCart?: () => void;
  onBookConsultation?: () => void;
};

// Category images matching Private_Medi_Platform (MedicineForm::categoryImageUrl)
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

function getProductImageSource(product: Product): { uri: string } | any | null {
  const rawUrl = product.image_url ?? product.imageUrl ?? product.image;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { uri: getS3PresignedUrl(trimmed) };
    }
    // Relative path or S3 key (e.g. products/1.png or /products/1.png)
    const cleanKey = trimmed.replace(/^\/+/, '');
    return { uri: getS3PresignedUrl(`${S3_BUCKET_URL}/${cleanKey}`) };
  }

  const formKey = (product.form || product.category || (product.isAddonDevice || product.is_addon_device ? 'device' : '') || '').toLowerCase().trim();
  for (const [key, asset] of Object.entries(CATEGORY_IMAGES)) {
    if (formKey.includes(key)) {
      return asset;
    }
  }

  // Default fallback image
  return CATEGORY_IMAGES.flower;
}

export function ProductCard({ product, onPress, onAddToCart, onBookConsultation }: Props) {
  const isPrescribed = Boolean(product.prescribed || product.can_purchase);
  const needsRenewal = Boolean(product.needs_renewal && !isPrescribed);
  const imageSource = getProductImageSource(product);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Thumbnail area */}
      <View style={styles.thumbnailContainer}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>🌿</Text>
          </View>
        )}

        {/* Floating Badges */}
        <View style={styles.floatingBadges}>
          {isPrescribed ? (
            <View style={[styles.badge, styles.badgePrescribed]}>
              <Text style={styles.badgePrescribedText}>Prescribed</Text>
            </View>
          ) : needsRenewal ? (
            <View style={[styles.badge, styles.badgeRenewal]}>
              <Text style={styles.badgeRenewalText}>Renew</Text>
            </View>
          ) : null}

          {product.thc_content ? (
            <View style={[styles.badge, styles.badgeThc]}>
              <Text style={styles.badgeThcText}>THC {product.thc_content}</Text>
            </View>
          ) : null}

          {product.cbd_content ? (
            <View style={[styles.badge, styles.badgeCbd]}>
              <Text style={styles.badgeCbdText}>CBD {product.cbd_content}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Info area */}
      <View style={styles.info}>
        {product.manufacturer ? (
          <Text numberOfLines={1} style={styles.manufacturer}>
            {product.manufacturer}
          </Text>
        ) : null}

        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>

        <View style={styles.metaRow}>
          {product.strength ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{product.strength}</Text>
            </View>
          ) : null}
          {product.package_size ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{product.package_size}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Footer / Price & Action */}
      <View style={styles.footer}>
        <Text style={styles.price}>
          ${(product.unitPrice ?? product.unit_price ?? product.retailPrice ?? product.retail_price ?? product.price ?? 0).toFixed(2)}
        </Text>

        {isPrescribed ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
            style={({ pressed }) => [styles.actionButton, styles.addButton, pressed && styles.actionButtonPressed]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        ) : needsRenewal ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onBookConsultation?.();
            }}
            style={({ pressed }) => [styles.actionButton, styles.renewButton, pressed && styles.actionButtonPressed]}
          >
            <Text style={styles.renewButtonText}>Consult</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
            style={({ pressed }) => [styles.actionButton, styles.addButton, pressed && styles.actionButtonPressed]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  thumbnailContainer: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#fafafa',
    borderColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
    width: '100%',
  },
  image: {
    height: '85%',
    width: '85%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 42,
  },
  floatingBadges: {
    alignItems: 'flex-end',
    gap: 4,
    position: 'absolute',
    right: 6,
    top: 6,
    zIndex: 2,
  },
  badge: {
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgePrescribed: {
    backgroundColor: colors.emeraldChipBg,
    borderColor: colors.emeraldChipBorder,
    borderWidth: 0.5,
  },
  badgePrescribedText: {
    color: colors.emeraldChipText,
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '800',
  },
  badgeRenewal: {
    backgroundColor: '#fef3c7',
  },
  badgeRenewalText: {
    color: '#b45309',
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '700',
  },
  badgeThc: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  badgeThcText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '700',
  },
  badgeCbd: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  badgeCbdText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  manufacturer: {
    color: colors.mutedForeground,
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.secondary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    color: colors.mutedForeground,
    fontFamily: typography.medium,
    fontSize: 9,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs + 2,
  },
  price: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 14,
    fontWeight: '800',
  },
  actionButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  addButton: {
    backgroundColor: colors.accentLime,
  },
  addButtonText: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '800',
  },
  renewButton: {
    backgroundColor: '#fef3c7',
  },
  renewButtonText: {
    color: '#b45309',
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '700',
  },
});
