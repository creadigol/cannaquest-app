import { apiClient } from '@/lib/api/client';
import { normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type { Product, ProductListParams } from './product.types';

export async function fetchProducts(params: ProductListParams = {}): Promise<Product[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (params.category && params.category.toLowerCase() !== 'all') {
      queryParams.category = params.category;
    }
    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    const response = await apiClient.get<ApiResponse<Product[] | { data: Product[] }>>('/patient/v1/products', {
      params: queryParams,
    });

    if (__DEV__) {
      console.log('[Products API] fetchProducts response:', response.data);
    }

    const payload = response.data?.data as any;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.products)) {
      return payload.products;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }

    return [];
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (__DEV__) {
      console.error('[Products API] Failed to fetch products:', {
        kind: apiError.kind,
        status: apiError.status,
        message: apiError.message,
      });
    }
    throw apiError;
  }
}
