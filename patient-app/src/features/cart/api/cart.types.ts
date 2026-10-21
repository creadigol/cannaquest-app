export type CartStep = 'cart' | 'delivery' | 'payment';
export type ShippingMethod = 'delivery' | 'pickup';
export type PaymentMethodType = 'card' | 'payid';

export interface CartProduct {
    id: string | number;
    name: string;
    brand?: string | null;
    form?: string | null;
    strength?: string | null;
    category?: string | null;
    retailPrice?: number | string | null;
    retail_price?: number | string | null;
    unitPrice?: number | string | null;
    unit_price?: number | string | null;
    price?: number;
    imageUrl?: string | null;
    image_url?: string | null;
    isAddonDevice?: boolean;
    is_addon_device?: boolean;
    inStock?: boolean;
    in_stock?: boolean;
}

export interface CartItem {
    id: string | number;
    cartId?: string | number;
    productId: string | number;
    uploadPrescriptionId?: string | number | null;
    prescriptionId?: string | number | null;
    quantity: number;
    source: 'product' | 'prescription' | 'device' | string;
    addedAt?: string | null;
    isStale?: boolean;
    product?: CartProduct;
    // Convenience fields
    name?: string;
    brand?: string;
    form?: string;
    strength?: string;
    price?: number;
    imageUrl?: string | null;
}

export interface CartData {
    cartId: string | number;
    dispenserId?: string | number | null;
    items: CartItem[];
}

export interface DispenserOption {
    id: string | number;
    name: string;
    entityName?: string | null;
    entity_name?: string | null;
    headUserName?: string | null;
    head_user?: string | null;
    line1?: string | null;
    line2?: string | null;
    suburb?: string | null;
    state?: string | null;
    postCode?: string | null;
    postcode?: string | null;
    phone?: string | null;
    distanceKm?: number | null;
    distanceLabel?: string | null;
    in_stock?: boolean;
}

export interface FeeSettings {
    taxRate: number;
    shippingFee: number;
    platformFeeRate: number;
    platformFeeCard: number;
    platformFeePayId: number;
    paymentGatewayRate: number;
    paymentGatewayCost: number;
    usingDefaultsFor?: string[];
}

export interface PayIdSettings {
    payid_enabled?: boolean;
    payid_address?: string;
    payid_bsb?: string;
    payid_account_name?: string;
    payid_account_number?: string;
    payid_reference_prefix?: string;
    payid_expiry_hours?: number;
    payid_admin_alert_email?: string;
}

export interface FeeBreakdown {
    subtotal: number;
    pharmacistFee: number;
    shippingFee: number;
    paymentGatewayCost: number;
    tax: number;
    taxRatePct?: number;
    platformFee?: number;
    total: number;
    dispenserId?: string | number | null;
    payidDetails?: {
        address?: string;
        accountName?: string;
        bsb?: string;
        accountNumber?: string;
        expiryHours?: number;
    };
}

export interface SavedPaymentMethod {
    id: string | number;
    token?: string;
    brand: string;
    last4: string;
    expMonth: string | number;
    expYear: string | number;
    bank?: string | null;
    cardHolder?: string | null;
    masked?: string | null;
}

export interface CheckoutBillingAddress {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    suburb: string;
    state: string;
    postcode: string;
}

export interface StartCheckoutPayload {
    paymentType: PaymentMethodType;
    shippingMethod: ShippingMethod;
    dispenserId?: string | number | null;
    referenceNumber?: string;
    returnUrl?: string;
    amount?: number;
    subtotal?: number;
    shippingFee?: number;
    platformFee?: number;
    pharmacistFee?: number;
    tax?: number;
    paymentGatewayCost?: number;
    tillTransactionToken?: string | null;
    paymentMethodToken?: string | null;
    billing?: CheckoutBillingAddress;
}

export interface StartCheckoutResponse {
    transactionId?: string;
    status: 'pending' | 'redirect_required' | 'payid_pending' | 'success' | 'failed' | string;
    orderId?: string | number;
    orderUuid?: string;
    payidReference?: string;
    referenceNumber?: string;
    totalAmount?: number;
    redirectUrl?: string;
    qrCodeUrl?: string;
}
