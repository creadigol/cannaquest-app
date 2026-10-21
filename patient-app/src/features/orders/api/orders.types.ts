export type OrderStatusKey =
    | 'SUBMITTED'
    | 'PAID'
    | 'CANCELED'
    | 'APPROVED_BY_PHARMACIST'
    | 'DISAPPROVED_BY_PHARMACIST'
    | 'SHIPPING'
    | 'READY_TO_COLLECT'
    | 'COLLECTED'
    | 'REFUND'
    | 'AWAITING_PAYID_CONFIRMATION'
    | 'PAYID_EXPIRED';

export type StatusPillColor = 'emerald' | 'blue' | 'amber' | 'red' | 'gray';

export interface OrderProgressStep {
    name: string;
    status: 'completed' | 'current' | 'pending' | 'failed' | 'skipped' | 'ended';
    completed_at?: string | null;
    completed_by?: string | null;
}

export interface OrderItemProduct {
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    product_type?: string | null;
    form?: {
        name?: string;
        category?: string;
    } | null;
    image_url?: string | null;
    is_addon_device?: boolean;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    brand?: string | null;
    dispenser_name?: string | null;
    quantity: number;
    unit_price: number;
    amount: number;
    status?: {
        value: string;
        label: string;
        color?: string;
    } | string | null;
    disapproval_reason?: string | null;
    product?: OrderItemProduct | null;
}

export interface ConsignmentItem {
    id: number;
    product_name: string;
    quantity: number;
}

export interface ShippingConsignment {
    id: number;
    consignment_number?: string | null;
    carrier_name?: string | null;
    tracking_url?: string | null;
    notes?: string | null;
    shipped_at?: string | null;
    items?: ConsignmentItem[];
}

export interface OrderPricingBreakdown {
    subtotal: number;
    shippingFee: number;
    platformFee: number;
    pharmacistFee: number;
    tax: number;
    paymentGatewayCost: number;
    totalAmount: number;
}

export interface PayIdDetails {
    payid_address?: string;
    payid_bsb?: string;
    payid_account_number?: string;
    payid_account_name?: string;
    payid_reference?: string;
    payid_expiry_hours?: number;
    amount?: number;
    enabled?: boolean;
}

export interface OrderSummary {
    id: number;
    uuid: string;
    user_id: number;
    created_at: string;
    updated_at?: string;
    status?: string;
    payment_method?: 'card' | 'payid' | string;
    payid_reference?: string;
    shipping_summary?: string | null;
    tracking_url?: string | null;
    is_active?: boolean;
    has_invoice?: boolean;
    total_amount: number;
    status_config: {
        label: string;
        color: StatusPillColor;
        class?: string;
        icon?: string;
    };
    progress_steps: OrderProgressStep[];
    items: OrderItem[];
    transaction_history?: {
        id?: number;
        amount?: number;
        payment_status?: string;
        product_fee?: number;
        shipping_fee?: number;
        platform_fee?: number;
        pharmacist_fee?: number;
        tax?: number;
        payment_gateway_cost?: number;
    } | null;
}

export interface OrderDetail extends OrderSummary {
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    is_pickup?: boolean;
    pickup_location?: string | null;
    reference_number?: string;
    consignments?: ShippingConsignment[];
    can_pay?: boolean;
    breakdown?: OrderPricingBreakdown;
    payid_settings?: PayIdDetails;
}
