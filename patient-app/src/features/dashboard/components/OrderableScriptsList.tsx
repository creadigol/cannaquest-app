import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { brandLabel, colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { OrderablePrescription } from '../api/dashboard.types';
import { useCart } from '@/features/cart/context/CartContext';

const CATEGORY_IMAGES: Record<string, any> = {
  flower: require('../../../../assets/images/product-categories/jar.webp'),
  capsule: require('../../../../assets/images/product-categories/jar.webp'),
  edible: require('../../../../assets/images/product-categories/edible.webp'),
  oil: require('../../../../assets/images/product-categories/oil.webp'),
  vape: require('../../../../assets/images/product-categories/oil.webp'),
  cartridge: require('../../../../assets/images/product-categories/oil.webp'),
  device: require('../../../../assets/images/product-categories/device.webp'),
};

function getScriptThumbnail(rx: OrderablePrescription) {
  if (rx.imageUrl && (rx.imageUrl.startsWith('http://') || rx.imageUrl.startsWith('https://'))) {
    return { uri: rx.imageUrl };
  }
  const formKey = (rx.form || rx.name || '').toLowerCase();
  for (const [key, asset] of Object.entries(CATEGORY_IMAGES)) {
    if (formKey.includes(key)) {
      return asset;
    }
  }
  return CATEGORY_IMAGES.flower;
}

type Props = {
  scripts: OrderablePrescription[];
  onViewAll: () => void;
  onAddToCart: (rx: OrderablePrescription) => void;
};

export function OrderableScriptsList({ scripts, onViewAll, onAddToCart }: Props) {
  const { cart } = useCart();
  if (scripts.length === 0) return null;
  const visible = scripts.slice(0, 3);

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
  const isRxInCart = (rx: OrderablePrescription) => {
    return cartItems.some(
      (item) =>
        String(item.uploadPrescriptionId || item.prescriptionId || '') === String(rx.prescriptionId || rx.id)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={brandLabel}>Scripts Ready to Order</Text>
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>View All ({scripts.length})</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {visible.map((rx) => {
          const inCart = isRxInCart(rx);
          const imageSource = getScriptThumbnail(rx);
          const manufacturer = rx.manufacturer || rx.brand;
          const remaining = rx.remainingRepeats ?? (rx.repeatTimes != null && rx.repeatsFilled != null ? Math.max(0, rx.repeatTimes - rx.repeatsFilled) : null);

          return (
            <View key={rx.id} style={styles.row}>
              <View style={styles.imageWrap}>
                <Image source={imageSource} style={styles.thumbnail} resizeMode="contain" />
              </View>

              <View style={styles.textWrap}>
                <Text numberOfLines={1} style={styles.name}>
                  {rx.name}
                </Text>

                {manufacturer ? (
                  <Text numberOfLines={1} style={styles.brand}>
                    {manufacturer}
                  </Text>
                ) : null}

                <View style={styles.chipsRow}>
                  {rx.form ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{rx.form}</Text>
                    </View>
                  ) : null}

                  {rx.strength ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{rx.strength}</Text>
                    </View>
                  ) : null}

                  {remaining != null ? (
                    <View style={styles.repeatBadge}>
                      <Text style={styles.repeatBadgeText}>
                        {remaining} {remaining === 1 ? 'repeat' : 'repeats'} left
                      </Text>
                    </View>
                  ) : null}
                </View>

                {rx.unitPrice != null && Number(rx.unitPrice) > 0 ? (
                  <Text style={styles.price}>${Number(rx.unitPrice).toFixed(2)}</Text>
                ) : null}
              </View>

              {inCart ? (
                <View style={styles.inCartBadge}>
                  <Text style={styles.inCartText}>✓ In Cart</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => onAddToCart(rx)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Text style={styles.addButtonText}>Add to Cart</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  viewAll: {
    color: colors.emeraldChipText,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    ...shadows.tier1,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  thumbnail: {
    height: '75%',
    width: '75%',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  brand: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '600',
  },
  repeatBadge: {
    backgroundColor: '#ecfdf5',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  repeatBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  price: {
    color: colors.primaryGreen,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  addButton: {
    backgroundColor: colors.limeGradientStart,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: colors.primaryGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  inCartBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inCartText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});