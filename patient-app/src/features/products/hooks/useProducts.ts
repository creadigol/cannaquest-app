import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/products.api';
import type { ProductListParams } from '../api/product.types';

export function useProducts(params: ProductListParams = {}) {
  const normalizedCategory = params.category?.trim().toLowerCase() ?? 'all';
  const normalizedSearch = params.search?.trim().toLowerCase() ?? '';

  return useQuery({
    queryKey: ['products', { category: normalizedCategory, search: normalizedSearch }],
    queryFn: () => fetchProducts(params),
    staleTime: 60 * 1000,
  });
}
