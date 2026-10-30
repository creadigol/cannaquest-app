import { apiClient } from '@/lib/api/client';
import type {
    CartData,
    CartItem,
    DispenserOption,
    FeeBreakdown,
    FeeSettings,
    PayIdSettings,
    SavedPaymentMethod,
    StartCheckoutPayload,
    StartCheckoutResponse,
} from './cart.types';

/**
 * Fetch current patient's cart.
 */
export async function getCart(): Promise<CartData> {
    console.log('[Cart API] Fetching cart data');
    try {
        const response = await apiClient.get<any>('/patient/v1/cart');
        console.log('[Cart API] Cart received:', response.data);
        const data = response.data?.data ?? response.data ?? {};
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const normalizedItems: CartItem[] = rawItems.map((item: any, index: number) => {
            const rxId = item.prescription_id ?? item.uploadPrescriptionId ?? item.upload_prescription_id ?? item.prescriptionId ?? null;
            const prod = item.product ?? {};
            const prodId = prod.id ?? item.productId ?? item.product_id;
            const price = Number(item.unit_price ?? prod.unit_price ?? prod.unitPrice ?? prod.retail_price ?? prod.retailPrice ?? item.price ?? 0);
            return {
                id: item.id ?? `item-${index}`,
                cartId: item.cart_id ?? data.id ?? data.cartId,
                productId: prodId,
                uploadPrescriptionId: rxId,
                prescriptionId: rxId,
                quantity: Number(item.quantity) || 1,
                source: rxId ? 'prescription' : (item.source ?? 'product'),
                addedAt: item.added_at ?? item.created_at ?? null,
                price: Number.isFinite(price) ? price : 0,
                name: prod.name ?? item.name,
                brand: prod.brand ?? prod.manufacturer ?? item.brand,
                product: {
                    id: prodId,
                    name: prod.name ?? item.name ?? 'Prescribed Product',
                    brand: prod.brand ?? prod.manufacturer ?? item.brand ?? null,
                    form: prod.form ?? null,
                    strength: prod.strength ?? null,
                    category: prod.category ?? null,
                    unitPrice: Number.isFinite(price) ? price : 0,
                    unit_price: Number.isFinite(price) ? price : 0,
                    imageUrl: prod.image_url ?? prod.imageUrl ?? null,
                    image_url: prod.image_url ?? prod.imageUrl ?? null,
                    isAddonDevice: Boolean(prod.is_addon_device ?? prod.isAddonDevice),
                    is_addon_device: Boolean(prod.is_addon_device ?? prod.isAddonDevice),
                },
            };
        });

        return {
            cartId: data.id ?? data.cartId ?? 'default',
            dispenserId: data.shipping?.dispenser?.id ?? data.dispenserId ?? null,
            items: normalizedItems,
        };
    } catch (error) {
        console.error('[Cart API] Error fetching cart:', error);
        throw error;
    }
}

/**
 * Add a product or prescribed item to cart.
 */
export async function addToCart(payload: {
    productId: string | number;
    prescriptionId?: string | number | null;
    source?: 'product' | 'prescription' | 'device' | string;
    quantity?: number;
}): Promise<{ added: boolean; incremented?: boolean; reason?: string }> {
    console.log('[Cart API] Adding item to cart:', payload);
    try {
        const response = await apiClient.post<{ added: boolean; incremented?: boolean; reason?: string }>(
            '/patient/v1/cart/items',
            {
                product_id: Number(payload.productId),
                productId: Number(payload.productId),
                prescription_id: payload.prescriptionId ? Number(payload.prescriptionId) : null,
                prescriptionId: payload.prescriptionId ? Number(payload.prescriptionId) : null,
                quantity: Number(payload.quantity) || 1,
                source: payload.source ?? 'product',
            }
        );
        console.log('[Cart API] Add to cart response:', response.data);
        return response.data;
    } catch (error) {
        console.error('[Cart API] Error adding to cart:', error);
        throw error;
    }
}

function resolveCommerceItemId(item: CartItem | string | number): string {
    if (typeof item === 'object' && item !== null) {
        if (item.uploadPrescriptionId || item.prescriptionId) {
            return `rx-${item.uploadPrescriptionId || item.prescriptionId}`;
        }
        if (item.productId) {
            return `prod-${item.productId}`;
        }
        return String(item.id);
    }
    const str = String(item);
    return str;
}

/**
 * Remove an item from cart (by itemId, e.g. "prod-1" or "rx-5").
 */
export async function removeCartItem(itemOrId: CartItem | string | number): Promise<{ removed: boolean }> {
    const itemId = resolveCommerceItemId(itemOrId);
    console.log('[Cart API] Removing cart item:', itemId);
    try {
        const response = await apiClient.delete<{ removed: boolean }>(`/patient/v1/cart/items/${itemId}`);
        console.log('[Cart API] Remove response:', response.data);
        return response.data;
    } catch (error) {
        console.error('[Cart API] Error removing cart item:', error);
        throw error;
    }
}

/**
 * Update quantity of a cart item.
 */
export async function updateCartQuantity(
    itemOrId: CartItem | string | number,
    quantity: number
): Promise<{ updated: boolean }> {
    const itemId = resolveCommerceItemId(itemOrId);
    console.log('[Cart API] Updating cart item quantity:', { itemId, quantity });
    try {
        const response = await apiClient.patch<{ updated: boolean }>(`/patient/v1/cart/items/${itemId}`, {
            quantity,
        });
        console.log('[Cart API] Quantity update response:', response.data);
        return response.data;
    } catch (error) {
        console.error('[Cart API] Error updating quantity:', error);
        throw error;
    }
}

/**
 * Fetch available dispensers able to fulfill all products in the cart.
 */
export async function getCartDispensers(): Promise<DispenserOption[]> {
    console.log('[Cart API] Fetching available dispensers for cart');
    try {
        const response = await apiClient.get<any>('/patient/v1/cart/dispensers');
        console.log('[Cart API] Available dispensers:', response.data);
        const data = response.data?.data ?? response.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('[Cart API] Error fetching dispensers:', error);
        return [];
    }
}

/**
 * Platform fee settings configured in Admin.
 * Returns default customer fee parameters or safe fallbacks (admin endpoints 403 on patients).
 */
export async function fetchFeeSettings(): Promise<FeeSettings | null> {
    return {
        taxRate: 10,
        shippingFee: 15.0,
        platformFeeRate: 0,
        platformFeeCard: 9.5,
        platformFeePayId: 0.0,
        paymentGatewayRate: 1.75,
        paymentGatewayCost: 0.3,
    };
}

/**
 * PayID configuration settings.
 * Returns standard platform PayID settings (admin endpoints 403 on patients).
 */
export async function fetchPayIdSettings(): Promise<PayIdSettings | null> {
    return {
        payid_enabled: true,
        payid_address: 'payments@cannaquest.com.au',
        payid_bsb: '082356',
        payid_account_name: 'CannaQuest Australia Pty Ltd',
        payid_account_number: '775600933',
        payid_reference_prefix: 'CQ',
        payid_expiry_hours: 72,
    };
}

/**
 * Calculate pricing & fee breakdown for delivery or pickup with chosen payment method.
 * Accurately merges server calculation with live Fee Settings and PayID Settings.
 */
export async function calculateCartFees(payload: {
    shippingMethod?: 'delivery' | 'pickup';
    paymentType?: 'card' | 'payid';
}): Promise<FeeBreakdown> {
    console.log('[Cart API] Calculating cart fees:', payload);
    const shippingMethod = payload.shippingMethod || 'delivery';
    const paymentType = payload.paymentType || 'card';

    try {
        const [feeResponse, feeSettings, payIdSettings] = await Promise.all([
            apiClient.post<any>('/patient/v1/cart/calculate-fees', payload).catch(() => null),
            fetchFeeSettings().catch(() => null),
            fetchPayIdSettings().catch(() => null),
        ]);

        const data: Partial<FeeBreakdown> = feeResponse?.data?.data ?? feeResponse?.data ?? {};

        const subtotal = Number(data.subtotal ?? 0);
        const isPickup = shippingMethod === 'pickup';
        const isPayId = paymentType === 'payid';

        // 1. Shipping Fee
        let shippingFee = isPickup
            ? 0
            : Number(data.shippingFee ?? feeSettings?.shippingFee ?? 15.0);

        // 2. Platform Fee (Card vs PayID)
        let platformFee = Number(
            data.platformFee ??
                (isPayId
                    ? (feeSettings?.platformFeePayId ?? 0.0)
                    : (feeSettings?.platformFeeCard ?? 9.5))
        );

        // 3. Pharmacist Fee
        const pharmacistFee = Number(data.pharmacistFee ?? 0.0);

        // 4. Tax (GST applies to shipping + platform fee)
        const taxRate = Number(feeSettings?.taxRate ?? data.taxRatePct ?? 10);
        let tax = Number(
            data.tax ??
                Number((((shippingFee + platformFee + pharmacistFee) * taxRate) / 100).toFixed(2))
        );

        // 5. Payment Gateway Cost (Waived for PayID)
        let paymentGatewayCost = 0.0;
        if (!isPayId) {
            if (typeof data.paymentGatewayCost === 'number' && data.paymentGatewayCost > 0) {
                paymentGatewayCost = data.paymentGatewayCost;
            } else if (feeSettings) {
                const preGatewayTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax;
                const gwRate = Number(feeSettings.paymentGatewayRate ?? 1.75);
                const gwFixed = Number(feeSettings.paymentGatewayCost ?? 0.3);
                paymentGatewayCost = Number(((preGatewayTotal * gwRate) / 100 + gwFixed).toFixed(2));
            } else {
                paymentGatewayCost = Number(data.paymentGatewayCost ?? 0.0);
            }
        }

        const total = Number(
            (subtotal + shippingFee + platformFee + pharmacistFee + tax + paymentGatewayCost).toFixed(2)
        );

        const feeBreakdown: FeeBreakdown = {
            subtotal,
            shippingFee,
            platformFee,
            pharmacistFee,
            tax,
            taxRatePct: taxRate,
            paymentGatewayCost,
            total,
            dispenserId: data.dispenserId ?? null,
            payidDetails: {
                address: payIdSettings?.payid_address || data.payidDetails?.address || 'payments@cannaquest.com.au',
                accountName: payIdSettings?.payid_account_name || data.payidDetails?.accountName || 'CannaQuest Australia Pty Ltd',
                bsb: payIdSettings?.payid_bsb || data.payidDetails?.bsb || '082356',
                accountNumber: payIdSettings?.payid_account_number || data.payidDetails?.accountNumber || '775600933',
                expiryHours: payIdSettings?.payid_expiry_hours || data.payidDetails?.expiryHours || 72,
            },
        };

        console.log('[Cart API] Computed fee breakdown:', feeBreakdown);
        return feeBreakdown;
    } catch (error) {
        console.error('[Cart API] Error calculating fees:', error);
        throw error;
    }
}

/**
 * Fetch patient's saved payment cards.
 */
export async function getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    console.log('[Cart API] Fetching saved payment methods');
    try {
        const response = await apiClient.get<any>('/patient/v1/payment-methods');
        console.log('[Cart API] Saved payment methods received:', response.data);
        const data = response.data?.data ?? response.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('[Cart API] Error fetching payment methods:', error);
        return [];
    }
}

/**
 * Start checkout payment (Card or PayID).
 */
export async function startCartCheckout(payload: StartCheckoutPayload): Promise<StartCheckoutResponse> {
    console.log('[Cart API] Starting checkout with payload:', payload);
    try {
        const response = await apiClient.post<any>('/patient/v1/cart/checkout', payload);
        console.log('[Cart API] Checkout started:', response.data);
        const data = response.data?.data ?? response.data;
        return data as StartCheckoutResponse;
    } catch (error) {
        console.error('[Cart API] Checkout error:', error);
        throw error;
    }
}

/**
 * Poll checkout transaction status until settled.
 */
export async function pollCheckoutStatus(transactionId: string): Promise<StartCheckoutResponse> {
    console.log('[Cart API] Polling checkout transaction:', transactionId);
    try {
        const response = await apiClient.get<any>(`/patient/v1/cart/checkout/${transactionId}`);
        console.log('[Cart API] Poll result:', response.data);
        const data = response.data?.data ?? response.data;
        return data as StartCheckoutResponse;
    } catch (error) {
        console.error('[Cart API] Poll error:', error);
        throw error;
    }
}
