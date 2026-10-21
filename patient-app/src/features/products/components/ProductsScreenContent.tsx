import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';
import { useProducts } from '../hooks/useProducts';
import { ProductCatalogHeader } from './ProductCatalogHeader';
import { ProductCategoryChips } from './ProductCategoryChips';
import { ProductSearchBar } from './ProductSearchBar';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import type { Product } from '../api/product.types';

import { addToCart } from '@/features/cart/api/cart.api';
import { useCart } from '@/features/cart/context/CartContext';
import { Alert } from 'react-native';

export function ProductsScreenContent() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { refreshCart } = useCart();

  const { data: products = [], isLoading, isError, refetch, isRefetching } = useProducts({
    category: selectedCategory,
    search: searchQuery,
  });

  const handleAddToCart = async (product: Product) => {
    if (__DEV__) {
      console.log('[Products] Add to cart clicked for product:', product.id, product.name);
    }
    try {
      await addToCart({
        productId: Number(product.id),
        prescriptionId: product.prescription_id ? Number(product.prescription_id) : null,
        source: product.prescription_id ? 'prescription' : 'product',
      });
      await refreshCart();
      Alert.alert('Added to Cart', `${product.name} was added to your cart.`);
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Could not add product to cart.');
    }
  };

  const handleBookConsultation = () => {
    router.push('/(app)/(tabs)/consults' as Href);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ProductCatalogHeader />
      <ProductSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />
      <ProductCategoryChips
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Could not load products</Text>
          <Text style={styles.emptySubtitle}>
            There was an issue fetching the formulary catalog. Pull down to retry.
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyIcon}>🌿</Text>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'No matching products found' : 'No products available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? `We couldn't find anything matching "${searchQuery}". Try a different keyword or category.`
            : 'Explore our consultations to speak with a practitioner and access prescribed treatments.'}
        </Text>
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleBookConsultation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Book Consultation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <ProductCatalogHeader />
        <ProductSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
        <ProductCategoryChips
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primaryGreen}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => setSelectedProduct(item)}
            onAddToCart={() => handleAddToCart(item)}
            onBookConsultation={handleBookConsultation}
          />
        )}
      />

      <ProductDetailModal
        product={selectedProduct}
        visible={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBookConsultation={handleBookConsultation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    paddingBottom: 0,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
  },
  headerContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  columnWrapper: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  retryButtonText: {
    color: colors.accentLime,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: '700',
  },
});
