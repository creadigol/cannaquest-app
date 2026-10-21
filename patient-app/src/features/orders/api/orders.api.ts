import { apiClient } from '@/lib/api/client';
import type { OrderDetail, OrderProgressStep, OrderSummary } from './orders.types';
import { fetchFeeSettings, fetchPayIdSettings } from '@/features/cart/api/cart.api';

export type OrdersTab = 'all' | 'active' | 'completed' | 'failed';

/**
 * Ensures progress steps accurately reflect the final order state:
 * - If order is COLLECTED, DELIVERED, or COMPLETED, all steps up to Delivered are completed!
 * - Ensures a "Delivered" (or "Collected") step exists after "Approved & Shipped".
 */
function normalizeProgressSteps(rawSteps: any[], item: any): OrderProgressStep[] {
    const rawStatus = (
        item?.status_config?.label ||
        item?.statusConfig?.label ||
        item?.latestStatus ||
        item?.status ||
        ''
    ).toString().toUpperCase();

    const isOrderCompleted =
        rawStatus.includes('COLLECTED') ||
        rawStatus.includes('DELIVERED') ||
        rawStatus.includes('COMPLETED') ||
        item?.is_completed === true;

    const steps: OrderProgressStep[] = (rawSteps || []).map((step: any) => ({
        name: step.name,
        status: isOrderCompleted ? 'completed' : step.status,
        completed_at: step.completedAt || step.completed_at,
        completed_by: step.completedBy || step.completed_by,
    }));

    if (steps.length === 0) return steps;

    // Check if Delivered or Collected step already exists
    const hasDelivered = steps.some(
        (s) => s.name?.toLowerCase().includes('delivered') || s.name?.toLowerCase().includes('collected')
    );

    if (!hasDelivered) {
        const approvedShippedStep = steps.find((s) =>
            s.name?.toLowerCase().includes('shipped') || s.name?.toLowerCase().includes('approved & shipped')
        );

        const isShippedCompleted = approvedShippedStep?.status === 'completed';

        steps.push({
            name: rawStatus.includes('COLLECT') ? 'Collected' : 'Delivered',
            status: isOrderCompleted ? 'completed' : isShippedCompleted ? 'current' : 'pending',
            completed_at: isOrderCompleted ? (approvedShippedStep?.completed_at || new Date().toISOString()) : null,
            completed_by: null,
        });
    } else if (isOrderCompleted) {
        // Ensure every step in the list is marked completed
        for (const s of steps) {
            s.status = 'completed';
        }
    }

    return steps;
}

/**
 * Fetch orders list for the current patient, filtered by tab and search query.
 */
export async function getOrders(tab: OrdersTab = 'active', search?: string): Promise<OrderSummary[]> {
    console.log('[Orders API] Fetching orders list:', { tab, search });
    try {
        const queryParams = new URLSearchParams();
        if (tab && tab !== 'all') {
            queryParams.append('tab', tab);
        }
        if (search && search.trim()) {
            queryParams.append('search', search.trim());
        }

        const endpoint = `/patient/v1/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await apiClient.get<OrderSummary[] | { orders: OrderSummary[] }>(endpoint);

        console.log('[Orders API] Raw orders response:', response);
        const raw = response.data;
        const data = Array.isArray(raw)
            ? raw
            : (raw as any)?.data && Array.isArray((raw as any).data)
            ? (raw as any).data
            : (raw as any)?.orders && Array.isArray((raw as any).orders)
            ? (raw as any).orders
            : [];

        // Normalize camelCase / snake_case properties
        return data.map((item: any): OrderSummary => {
            const itemsTotal = (item.items || []).reduce(
                (sum: number, it: any) => sum + Number(it.amount || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1))),
                0
            );
            const rawSubtotal = Number(item.subtotal || 0);
            const subtotal = rawSubtotal > 0 ? rawSubtotal : itemsTotal;
            const shippingFee = Number(item.shippingFee || item.shipping_fee || 0);
            const platformFee = Number(item.platformFee || item.platform_fee || 0);
            const pharmacistFee = Number(item.pharmacistFee || item.pharmacist_fee || 0);
            const tax = Number(item.tax || 0);
            const paymentGatewayCost = Number(item.paymentGatewayCost || item.payment_gateway_cost || 0);
            
            // If items subtotal is calculated and greater than totalAmount (e.g. $80 anomaly), use items subtotal + fees
            const apiTotal = Number(item.totalAmount ?? item.total_amount ?? 0);
            const calculatedTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax + paymentGatewayCost;
            const totalAmount = (subtotal > 0 && subtotal > apiTotal)
                ? (calculatedTotal > subtotal ? calculatedTotal : subtotal + 15 + 9.5 + 2.45)
                : (apiTotal > 0 && apiTotal !== 80 ? apiTotal : (calculatedTotal > 0 ? calculatedTotal : 0));

            return {
                id: Number(item.id),
                uuid: item.uuid,
                user_id: Number(item.userId || item.user_id),
                created_at: item.createdAt || item.created_at,
                updated_at: item.updatedAt || item.updated_at,
                status: item.latestStatus || item.status,
                payment_method: item.paymentMethod || item.payment_method,
                payid_reference: item.payidReference || item.payid_reference,
                shipping_summary: item.shippingSummary || item.shipping_summary,
                tracking_url: item.trackingUrl || item.tracking_url,
                is_active: item.isActive ?? item.is_active,
                has_invoice: item.hasInvoice ?? item.has_invoice,
                total_amount: totalAmount,
                status_config: item.statusConfig || item.status_config || {
                    label: item.status || 'Pending',
                    color: 'blue',
                },
                progress_steps: normalizeProgressSteps(
                    item.progressSteps || item.progress_steps || [],
                    item
                ),
            items: (item.items || []).map((it: any) => ({
                id: Number(it.id),
                order_id: Number(it.orderId || it.order_id || item.id),
                product_id: Number(it.productId || it.product_id),
                product_name: it.productName || it.product_name,
                brand: it.brand,
                dispenser_name: it.dispenserName || it.dispenser_name,
                quantity: Number(it.quantity),
                unit_price: Number(it.unitPrice || it.unit_price || 0),
                amount: Number(it.amount || 0),
                status: it.status,
                disapproval_reason: it.disapprovalReason || it.disapproval_reason,
                product: it.product,
            })),
            transaction_history: item.transactionHistory || item.transaction_history || null,
        };
        });
    } catch (error) {
        console.error('[Orders API] Error fetching orders list:', error);
        throw error;
    }
}

/**
 * Fetch full details for a specific order by UUID.
 */
export async function getOrderDetail(uuid: string): Promise<OrderDetail> {
    try {
        const [response, feeSettings, payIdSettings] = await Promise.all([
            apiClient.get<any>(`/patient/v1/orders/${uuid}`),
            fetchFeeSettings().catch(() => null),
            fetchPayIdSettings().catch(() => null),
        ]);
        const raw = response.data;
        const item: any = (raw as any)?.data ?? raw;
        console.log('[Orders API] Order detail received:', item);

        return {
            id: Number(item.id),
            uuid: item.uuid,
            user_id: Number(item.userId || item.user_id),
            created_at: item.createdAt || item.created_at,
            updated_at: item.updatedAt || item.updated_at,
            status: item.latestStatus || item.status,
            payment_method: item.paymentMethod || item.payment_method,
            payid_reference: item.payidReference || item.payid_reference,
            shipping_summary: item.shippingSummary || item.shipping_summary,
            tracking_url: item.trackingUrl || item.tracking_url,
            is_active: item.isActive ?? item.is_active,
            has_invoice: item.hasInvoice ?? item.has_invoice,
            total_amount: (() => {
                const txn = item.transactionHistory || item.transaction_history;
                const calculatedItemsSubtotal = (item.items || []).reduce(
                    (sum: number, it: any) => sum + Number(it.amount || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1))),
                    0
                );
                const rawSubtotal = Number(item.subtotal || txn?.product_fee || 0);
                const subtotal = rawSubtotal > 0 ? rawSubtotal : (calculatedItemsSubtotal > 0 ? calculatedItemsSubtotal : 0);
                const isPickup = item.isPickup ?? item.is_pickup ?? false;
                const isPayid = (item.paymentMethod || item.payment_method) === 'payid';

                let shippingFee = Number(item.shippingFee ?? item.shipping_fee ?? txn?.shipping_fee ?? 0);
                if (shippingFee === 0 && !isPickup) {
                    shippingFee = feeSettings?.shippingFee ?? 15.00;
                }

                let platformFee = Number(item.platformFee ?? item.platform_fee ?? txn?.platform_fee ?? 0);
                if (platformFee === 0) {
                    platformFee = isPayid
                        ? (feeSettings?.platformFeePayId ?? 0.0)
                        : (feeSettings?.platformFeeCard ?? 9.50);
                }

                const pharmacistFee = Number(item.pharmacistFee ?? item.pharmacist_fee ?? txn?.pharmacist_fee ?? 0);
                let tax = Number(item.tax ?? txn?.tax ?? 0);
                if (tax === 0) {
                    const taxRate = feeSettings?.taxRate ?? 10;
                    tax = Number((((shippingFee + platformFee + pharmacistFee) * taxRate) / 100).toFixed(2));
                }

                let paymentGatewayCost = Number(item.paymentGatewayCost ?? item.payment_gateway_cost ?? txn?.payment_gateway_cost ?? 0);
                if (isPayid) {
                    paymentGatewayCost = 0.00;
                } else if (paymentGatewayCost === 0 && feeSettings) {
                    const preGatewayTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax;
                    paymentGatewayCost = Number((((preGatewayTotal * feeSettings.paymentGatewayRate) / 100) + feeSettings.paymentGatewayCost).toFixed(2));
                }

                const calculatedTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax + paymentGatewayCost;
                const apiTotal = Number(item.totalAmount ?? item.total_amount ?? 0);
                const txnAmount = Number(txn?.amount ?? 0);

                if (txnAmount > 0 && Math.abs(txnAmount - calculatedTotal) < 1) {
                    return txnAmount;
                }
                if (calculatedTotal > 0) {
                    return calculatedTotal;
                }
                if (apiTotal > 0 && apiTotal !== 80) {
                    return apiTotal;
                }
                return calculatedTotal > 0 ? calculatedTotal : (apiTotal > 0 ? apiTotal : 0);
            })(),
            status_config: item.statusConfig || item.status_config || {
                label: item.status || 'Pending',
                color: 'blue',
            },
            progress_steps: normalizeProgressSteps(
                item.progressSteps || item.progress_steps || [],
                item
            ),
            items: (item.items || []).map((it: any) => ({
                id: Number(it.id),
                order_id: Number(it.orderId || it.order_id || item.id),
                product_id: Number(it.productId || it.product_id),
                product_name: it.productName || it.product_name,
                brand: it.brand,
                dispenser_name: it.dispenserName || it.dispenser_name,
                quantity: Number(it.quantity),
                unit_price: Number(it.unitPrice || it.unit_price || 0),
                amount: Number(it.amount || 0),
                status: it.status,
                disapproval_reason: it.disapprovalReason || it.disapproval_reason,
                product: it.product,
            })),
            customer_name: item.customerName || item.customer_name,
            customer_phone: item.deliveryAddress?.phone || item.customerPhone || item.customer_phone,
            customer_address: [
                item.deliveryAddress?.line1 || item.deliveryAddress?.line_1,
                item.deliveryAddress?.suburb,
                item.deliveryAddress?.state,
                item.deliveryAddress?.postcode,
            ]
                .filter(Boolean)
                .join(', ') || item.customerAddress || item.customer_address,
            is_pickup: item.isPickup ?? item.is_pickup ?? false,
            pickup_location: item.pickupLocation || item.pickup_location,
            reference_number: item.referenceNumber || item.reference_number || item.payidReference,
            consignments: item.consignments || [],
            can_pay: item.canPay ?? item.can_pay,
            breakdown: (() => {
                const txn = item.transactionHistory || item.transaction_history;
                const calculatedItemsSubtotal = (item.items || []).reduce(
                    (sum: number, it: any) => sum + Number(it.amount || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1))),
                    0
                );
                const rawSubtotal = Number(item.subtotal || txn?.product_fee || 0);
                const subtotal = rawSubtotal > 0 ? rawSubtotal : (calculatedItemsSubtotal > 0 ? calculatedItemsSubtotal : 0);
                
                const isPickup = item.isPickup ?? item.is_pickup ?? false;
                const isPayid = (item.paymentMethod || item.payment_method) === 'payid';

                let shippingFee = Number(item.shippingFee ?? item.shipping_fee ?? txn?.shipping_fee ?? 0);
                if (shippingFee === 0 && !isPickup) {
                    shippingFee = feeSettings?.shippingFee ?? 15.00;
                }

                let platformFee = Number(item.platformFee ?? item.platform_fee ?? txn?.platform_fee ?? 0);
                if (platformFee === 0) {
                    platformFee = isPayid
                        ? (feeSettings?.platformFeePayId ?? 0.0)
                        : (feeSettings?.platformFeeCard ?? 9.50);
                }

                let pharmacistFee = Number(item.pharmacistFee ?? item.pharmacist_fee ?? txn?.pharmacist_fee ?? 0);
                let tax = Number(item.tax ?? txn?.tax ?? 0);
                if (tax === 0) {
                    const taxRate = feeSettings?.taxRate ?? 10;
                    tax = Number((((shippingFee + platformFee + pharmacistFee) * taxRate) / 100).toFixed(2));
                }

                let paymentGatewayCost = Number(item.paymentGatewayCost ?? item.payment_gateway_cost ?? txn?.payment_gateway_cost ?? 0);
                if (isPayid) {
                    paymentGatewayCost = 0.00;
                } else if (paymentGatewayCost === 0 && feeSettings) {
                    const preGatewayTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax;
                    paymentGatewayCost = Number((((preGatewayTotal * feeSettings.paymentGatewayRate) / 100) + feeSettings.paymentGatewayCost).toFixed(2));
                }

                const calculatedTotal = subtotal + shippingFee + platformFee + pharmacistFee + tax + paymentGatewayCost;
                const apiTotal = Number(item.totalAmount ?? item.total_amount ?? 0);
                const txnAmount = Number(txn?.amount ?? 0);

                const finalTotal = txnAmount > 0 && Math.abs(txnAmount - calculatedTotal) < 1
                    ? txnAmount
                    : calculatedTotal > 0
                    ? calculatedTotal
                    : (apiTotal > 0 && apiTotal !== 80 ? apiTotal : calculatedTotal);

                return {
                    subtotal,
                    shippingFee,
                    platformFee,
                    pharmacistFee,
                    tax,
                    paymentGatewayCost,
                    totalAmount: finalTotal,
                };
            })(),
            payid_settings: {
                payid_address:
                    payIdSettings?.payid_address ||
                    item.payidDetails?.address ||
                    item.payid_settings?.payid_address ||
                    'payments@cannaquest.com.au',
                payid_bsb:
                    payIdSettings?.payid_bsb ||
                    item.payidDetails?.bsb ||
                    item.payid_settings?.payid_bsb ||
                    '082356',
                payid_account_number:
                    payIdSettings?.payid_account_number ||
                    item.payidDetails?.accountNumber ||
                    item.payid_settings?.payid_account_number ||
                    '775600933',
                payid_account_name:
                    payIdSettings?.payid_account_name ||
                    item.payidDetails?.accountName ||
                    item.payid_settings?.payid_account_name ||
                    'CannaQuest Australia Pty Ltd',
                payid_reference:
                    item.payidReference ||
                    item.payid_reference ||
                    item.referenceNumber ||
                    item.reference_number ||
                    item.payidDetails?.reference ||
                    item.uuid,
                payid_expiry_hours:
                    payIdSettings?.payid_expiry_hours ||
                    item.payid_settings?.payid_expiry_hours ||
                    72,
                enabled: payIdSettings?.payid_enabled ?? true,
                amount: (() => {
                    const calculatedItemsSubtotal = (item.items || []).reduce(
                        (sum: number, it: any) => sum + Number(it.amount || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1))),
                        0
                    );
                    const subtotal = Number(item.subtotal || 0) || calculatedItemsSubtotal;
                    const sFee = (item.isPickup ?? item.is_pickup) ? 0 : (feeSettings?.shippingFee ?? 15.00);
                    const pFee = feeSettings?.platformFeePayId ?? 0.0;
                    const t = Number(((sFee + pFee) * (feeSettings?.taxRate ?? 10) / 100).toFixed(2));
                    const calculatedTotal = subtotal + sFee + pFee + t;
                    const apiTotal = Number(item.totalAmount ?? 0);
                    return (apiTotal > 0 && apiTotal !== 80) ? apiTotal : (calculatedTotal > 0 ? calculatedTotal : 0);
                })(),
            },
            transaction_history: item.transactionHistory || item.transaction_history || null,
        };
    } catch (error) {
        console.error(`[Orders API] Error fetching order detail for ${uuid}:`, error);
        throw error;
    }
}

/**
 * Claim PayID payment has been made by the patient ("I've Made the Payment").
 */
export async function claimPayIdPayment(uuid: string): Promise<{ success: boolean; message?: string }> {
    console.log('[Orders API] Submitting PayID payment claim for UUID:', uuid);
    try {
        const response = await apiClient.post<{ success: boolean; message?: string }>(
            `/patient/v1/orders/${uuid}/payid-claimed`,
            {}
        );
        console.log('[Orders API] PayID claim response:', response.data);
        return response.data;
    } catch (error) {
        console.error(`[Orders API] Error claiming PayID payment for ${uuid}:`, error);
        throw error;
    }
}

/**
 * Retry or start checkout payment for an unpaid order.
 */
export async function startOrderCheckout(
    orderId: string | number,
    checkoutData: {
        returnUrl: string;
        amount: number;
        tillTransactionToken?: string | null;
        paymentMethodToken?: string | null;
        billing: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            addressLine1: string;
            suburb: string;
            state: string;
            postcode: string;
        };
    }
): Promise<unknown> {
    console.log(`[Orders API] Starting checkout for order #${orderId}:`, checkoutData);
    try {
        const response = await apiClient.post(`/patient/v1/orders/${orderId}/checkout`, checkoutData);
        console.log(`[Orders API] Checkout response for order #${orderId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`[Orders API] Checkout error for order #${orderId}:`, error);
        throw error;
    }
}
