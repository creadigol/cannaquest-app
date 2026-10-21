import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import { useCart } from '../context/CartContext';
import { CartStepProgress } from './CartStepProgress';
import { CartItemCard } from './CartItemCard';
import { OrderFeeSummaryCard } from './OrderFeeSummaryCard';
import { PayIdSuccessView } from './PayIdSuccessView';
import { CardSuccessView } from './CardSuccessView';
import { CardFailureView } from './CardFailureView';
import { fetchCurrentCustomer } from '@/features/customer/api/customer.api';
import {
    calculateCartFees,
    getCart,
    getCartDispensers,
    getSavedPaymentMethods,
    removeCartItem,
    startCartCheckout,
    updateCartQuantity,
} from '../api/cart.api';
import type {
    CartData,
    CartItem,
    CartStep,
    DispenserOption,
    FeeBreakdown,
    PaymentMethodType,
    SavedPaymentMethod,
    ShippingMethod,
    StartCheckoutResponse,
} from '../api/cart.types';

export function CartScreenContent() {
    // Flow step: cart -> delivery -> payment
    const [step, setStep] = useState<CartStep>('cart');
    const { refreshCart } = useCart();
    const [cart, setCart] = useState<CartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState<string | number | null>(null);

    // Delivery details
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('delivery');
    const [deliveryName, setDeliveryName] = useState('Patient');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [addrLine1, setAddrLine1] = useState('');
    const [addrLine2, setAddrLine2] = useState('');
    const [addrSuburb, setAddrSuburb] = useState('');
    const [addrState, setAddrState] = useState('QLD');
    const [addrPostcode, setAddrPostcode] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');

    // Dispensers
    const [dispensers, setDispensers] = useState<DispenserOption[]>([]);
    const [selectedDispenserId, setSelectedDispenserId] = useState<string | number | null>(null);
    const [dispensersLoading, setDispensersLoading] = useState(false);

    // Payment details
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
    const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
    const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
    const [selectedCardToken, setSelectedCardToken] = useState<string | null>(null);
    const [useNewCard, setUseNewCard] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [saveCardForFuture, setSaveCardForFuture] = useState(false);

    // Submission & Confirmation
    const [submitting, setSubmitting] = useState(false);
    const [payIdOrderSuccess, setPayIdOrderSuccess] = useState<StartCheckoutResponse | null>(null);
    const [cardOrderSuccess, setCardOrderSuccess] = useState<StartCheckoutResponse | null>(null);
    const [cardOrderError, setCardOrderError] = useState<string | null>(null);

    // Device restriction logic:
    // If any item in the cart is a device (source === 'device' or isAddonDevice), delivery is not allowed, only Pickup
    const hasDeviceItem = (cart?.items || []).some(
        (item) => item.source === 'device' || Boolean(item.product?.isAddonDevice || item.product?.is_addon_device)
    );

    // Auto-populate customer profile and delivery address from DB on mount
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const customer = await fetchCurrentCustomer();
                if (!customer || !isMounted) return;

                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                if (fullName) setDeliveryName(fullName);
                if (customer.phone) setDeliveryPhone(customer.phone);

                if (customer.address) {
                    if (customer.address.line1) setAddrLine1(customer.address.line1);
                    if (customer.address.line2) setAddrLine2(customer.address.line2);
                    if (customer.address.suburb) setAddrSuburb(customer.address.suburb);
                    if (customer.address.state) setAddrState(customer.address.state);
                    if (customer.address.postcode) setAddrPostcode(customer.address.postcode);
                }

                if (customer.preferredDispenserId) {
                    setSelectedDispenserId((prev) => prev || customer.preferredDispenserId);
                }
            } catch (err) {
                console.warn('[CartScreen] Could not auto-fetch customer address:', err);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    // When cart contains a device, enforce 'delivery' shipping method (pickup is disabled)
    useEffect(() => {
        if (hasDeviceItem && shippingMethod !== 'delivery') {
            setShippingMethod('delivery');
        }
    }, [hasDeviceItem, shippingMethod]);

    // Load cart items
    const loadCart = useCallback(async (options?: { refresh?: boolean; silent?: boolean }) => {
        if (options?.refresh) {
            setRefreshing(true);
        } else if (!options?.silent) {
            setLoading(true);
        }

        try {
            const data = await getCart();
            setCart(data);
            // If the cart has items, clear any stale checkout confirmation view so patient sees their cart
            if (data?.items && data.items.length > 0) {
                setPayIdOrderSuccess(null);
                setCardOrderSuccess(null);
            }
        } catch (error) {
            console.error('[CartScreen] Error loading cart:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    // When advancing to Delivery, load available dispensers & fees
    useEffect(() => {
        if (step === 'delivery' || step === 'payment') {
            loadDispensersAndFees();
        }
    }, [step, shippingMethod, paymentMethod]);

    const loadDispensersAndFees = async () => {
        setDispensersLoading(true);
        try {
            const [dispenserList, fees, cards] = await Promise.all([
                getCartDispensers(),
                calculateCartFees({ shippingMethod, paymentType: paymentMethod }),
                getSavedPaymentMethods(),
            ]);
            setDispensers(dispenserList);
            if (!selectedDispenserId && dispenserList.length > 0) {
                setSelectedDispenserId(Number(dispenserList[0].id));
            }
            setFeeBreakdown(fees);
            setSavedCards(cards);
            if (cards.length > 0 && !selectedCardToken) {
                setSelectedCardToken(cards[0].token || String(cards[0].id));
            } else if (cards.length === 0) {
                setUseNewCard(true);
            }
        } catch (error) {
            console.error('[CartScreen] Error loading delivery info:', error);
        } finally {
            setDispensersLoading(false);
        }
    };

    const handleUpdateQuantity = async (item: CartItem, newQty: number) => {
        setUpdatingItemId(item.id);

        // Optimistic UI update: instantly update count so there is no lag or page reload
        setCart((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)),
            };
        });

        try {
            await updateCartQuantity(item, newQty);
            await Promise.all([loadCart({ silent: true }), refreshCart()]);
        } catch {
            // Revert on error
            await loadCart({ silent: true });
            Alert.alert('Error', 'Could not update item quantity.');
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handleRemoveItem = async (item: CartItem) => {
        setUpdatingItemId(item.id);

        // Optimistic UI removal
        setCart((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.filter((i) => i.id !== item.id),
            };
        });

        try {
            await removeCartItem(item);
            await Promise.all([loadCart({ silent: true }), refreshCart()]);
        } catch {
            await loadCart({ silent: true });
            Alert.alert('Error', 'Could not remove item.');
        } finally {
            setUpdatingItemId(null);
        }
    };

    // Card input formatters
    const handleCardNumberChange = (text: string) => {
        // Strip non-digits and limit to 16 digits
        const digits = text.replace(/\D/g, '').slice(0, 16);
        // Format with space every 4 digits: XXXX XXXX XXXX XXXX
        const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
        setCardNumber(formatted);
    };

    const handleCardExpiryChange = (text: string) => {
        // Only accept numbers
        const digits = text.replace(/\D/g, '').slice(0, 4);

        if (digits.length <= 2) {
            setCardExpiry(digits);
        } else {
            // Automatically insert slash for MM/YY
            setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
        }
    };

    const handleCardCvvChange = (text: string) => {
        // Only accept numbers and restrict to exactly 3 digits
        const digits = text.replace(/\D/g, '').slice(0, 3);
        setCardCvv(digits);
    };

    const handleProceedToDelivery = () => {
        if (!cart?.items || cart.items.length === 0) {
            Alert.alert('Cart is empty', 'Add prescribed items before checking out.');
            return;
        }
        setStep('delivery');
    };

    const handleProceedToPayment = () => {
        if (shippingMethod === 'delivery') {
            if (!addrLine1.trim() || !addrSuburb.trim() || !addrPostcode.trim()) {
                Alert.alert('Address Required', 'Please enter your street address, suburb, and postcode.');
                return;
            }
        }
        if (!selectedDispenserId && dispensers.length > 0) {
            Alert.alert('Dispenser Required', 'Please select a fulfilling dispenser for your medication.');
            return;
        }

        // If PayID, create order immediately and redirect to instructions
        if (paymentMethod === 'payid') {
            executeCheckout();
            return;
        }

        setStep('payment');
    };

    const executeCheckout = async (paymentTypeOverride?: PaymentMethodType) => {
        setSubmitting(true);
        const activePaymentType = paymentTypeOverride || paymentMethod;
        try {
            // Guarantee fresh fee calculations if feeBreakdown is missing or uncalculated
            let currentFees = feeBreakdown;
            if (!currentFees || currentFees.total === 0) {
                try {
                    currentFees = await calculateCartFees({
                        shippingMethod,
                        paymentType: activePaymentType,
                    });
                    if (currentFees) {
                        setFeeBreakdown(currentFees);
                    }
                } catch (feeErr) {
                    console.warn('[CartScreen] Could not refresh fees before checkout, using state:', feeErr);
                }
            }

            const billing = {
                firstName: deliveryName.split(' ')[0] || 'Patient',
                lastName: deliveryName.split(' ').slice(1).join(' ') || 'User',
                email: 'patient@cannaquest.com.au',
                phone: deliveryPhone || '0400000000',
                addressLine1: addrLine1 || '123 Health Street',
                addressLine2: addrLine2 || undefined,
                suburb: addrSuburb || 'Brisbane',
                state: addrState || 'QLD',
                postcode: addrPostcode || '4000',
            };

            const numericDispenserId = selectedDispenserId
                ? Number(selectedDispenserId)
                : dispensers.length > 0
                ? Number(dispensers[0].id)
                : currentFees?.dispenserId
                ? Number(currentFees.dispenserId)
                : undefined;

            const payload = {
                paymentType: activePaymentType,
                shippingMethod,
                dispenserId: Number.isFinite(numericDispenserId) ? numericDispenserId : undefined,
                referenceNumber: referenceNumber || undefined,
                amount: currentFees?.total ?? 0,
                subtotal: currentFees?.subtotal ?? 0,
                shippingFee: currentFees?.shippingFee ?? 0,
                platformFee: currentFees?.platformFee ?? 0,
                pharmacistFee: currentFees?.pharmacistFee ?? 0,
                tax: currentFees?.tax ?? 0,
                paymentGatewayCost: currentFees?.paymentGatewayCost ?? 0,
                returnUrl: 'https://patient.cannaquest.com.au/payment/order-success',
                billing,
                deliveryAddress: {
                    line1: addrLine1 || '123 Health Street',
                    line2: addrLine2 || undefined,
                    suburb: addrSuburb || 'Brisbane',
                    state: addrState || 'QLD',
                    postcode: addrPostcode || '4000',
                    phone: deliveryPhone || '0400000000',
                },
                paymentMethodToken: activePaymentType === 'card' && !useNewCard ? selectedCardToken : null,
                tillTransactionToken: activePaymentType === 'card' && useNewCard ? 'TOK_NEW_CARD' : null,
            };

            const response = await startCartCheckout(payload);

            // Refresh cart badge in footer
            refreshCart();

            // Check if checkout transaction failed
            if (response.status === 'failed' || (response as any).status === 'error') {
                const failMsg =
                    (response as any).message ||
                    'Payment was declined by your bank or the payment processor. Please check your card details or try PayID.';
                setCardOrderError(failMsg);
                return;
            }

            if (activePaymentType === 'payid' || response.status === 'payid_pending') {
                // Ensure totalAmount and fee breakdown are firmly reflected
                const enrichedResponse = {
                    ...response,
                    totalAmount: response.totalAmount && Number(response.totalAmount) > 0
                        ? Number(response.totalAmount)
                        : currentFees?.total ?? 0,
                };
                setPayIdOrderSuccess(enrichedResponse);
            } else {
                setCardOrderSuccess(response);
            }
        } catch (err: any) {
            console.error('[CartScreen] Checkout error:', err);
            const errMsg = err?.message || err?.responseData?.message || 'Could not process payment. Please verify your details.';
            setCardOrderError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (payIdOrderSuccess) {
        return (
            <ScrollView contentContainerStyle={styles.scrollPad}>
                <PayIdSuccessView
                    onDone={() => {
                        setPayIdOrderSuccess(null);
                        router.push('/(app)/(tabs)');
                    }}
                    onViewOrder={() => {
                        setPayIdOrderSuccess(null);
                        router.push('/(app)/(tabs)/orders');
                    }}
                    onBackToCart={() => {
                        setPayIdOrderSuccess(null);
                        setStep('cart');
                        loadCart({ refresh: true });
                    }}
                    orderInfo={payIdOrderSuccess}
                    feeBreakdown={feeBreakdown}
                />
            </ScrollView>
        );
    }

    if (cardOrderSuccess) {
        return (
            <ScrollView contentContainerStyle={styles.scrollPad}>
                <CardSuccessView
                    onDone={() => {
                        setCardOrderSuccess(null);
                        router.push('/(app)/(tabs)');
                    }}
                    onViewOrder={() => {
                        setCardOrderSuccess(null);
                        router.push('/(app)/(tabs)/orders');
                    }}
                    onBackToCart={() => {
                        setCardOrderSuccess(null);
                        setStep('cart');
                        loadCart({ refresh: true });
                    }}
                    orderInfo={cardOrderSuccess}
                />
            </ScrollView>
        );
    }

    if (cardOrderError) {
        return (
            <ScrollView contentContainerStyle={styles.scrollPad}>
                <CardFailureView
                    errorMessage={cardOrderError}
                    onBackToCart={() => {
                        setCardOrderError(null);
                        setStep('cart');
                    }}
                    onRetry={() => {
                        setCardOrderError(null);
                        setStep('payment');
                    }}
                    onSwitchToPayId={() => {
                        setCardOrderError(null);
                        setPaymentMethod('payid');
                        executeCheckout('payid');
                    }}
                />
            </ScrollView>
        );
    }

    const items = cart?.items || [];
    const cartItemCount = items.length;
    const subtotal = items.reduce((sum, i) => {
        const unitPrice = Number(i.product?.unitPrice ?? i.product?.retailPrice ?? i.price ?? 0);
        return sum + unitPrice * (i.quantity || 1);
    }, 0);

    return (
        <View style={styles.container}>
            {/* ── Header ────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable
                    hitSlop={10}
                    onPress={() => {
                        if (step === 'payment') setStep('delivery');
                        else if (step === 'delivery') setStep('cart');
                        else router.back();
                    }}
                    style={styles.backBtn}
                >
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>
                        {step === 'cart' ? 'Your Cart' : step === 'delivery' ? 'Delivery' : 'Payment'}
                        {step === 'cart' && cartItemCount > 0 ? (
                            <Text style={styles.headerCount}> ({cartItemCount})</Text>
                        ) : null}
                    </Text>
                </View>

                {/* 3-Step Progress Indicator */}
                <CartStepProgress currentStep={step} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator color={colors.primaryGreen} size="large" />
                    <Text style={styles.loaderText}>Loading your cart…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollPad}
                    refreshControl={
                        <RefreshControl
                            colors={[colors.primaryGreen]}
                            onRefresh={() => loadCart({ refresh: true })}
                            refreshing={refreshing}
                            tintColor={colors.primaryGreen}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* ══════════════ STEP 1: CART ══════════════ */}
                    {step === 'cart' && (
                        <>
                            {items.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <View style={styles.emptyIconCircle}>
                                        <Text style={styles.emptyIcon}>🛒</Text>
                                    </View>
                                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                                    <Text style={styles.emptySub}>
                                        Add your prescribed items or catalog products to place an order.
                                    </Text>
                                    <Pressable
                                        onPress={() => router.push('/(app)/(tabs)/scripts')}
                                        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                                    >
                                        <Text style={styles.primaryBtnText}>Browse Prescriptions</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <>
                                    {items.map((item) => (
                                        <CartItemCard
                                            isUpdating={updatingItemId === item.id}
                                            item={item}
                                            key={item.id}
                                            onRemove={() => handleRemoveItem(item)}
                                            onUpdateQuantity={(newQty) => handleUpdateQuantity(item, newQty)}
                                        />
                                    ))}

                                    {/* Order Summary Card */}
                                    <View style={styles.surfaceCard}>
                                        <Text style={styles.cardSectionLabel}>ORDER ESTIMATE</Text>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Subtotal</Text>
                                            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Shipping</Text>
                                            <Text style={styles.summaryMuted}>Calculated at checkout</Text>
                                        </View>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
                                            <Text style={styles.summaryTotalValue}>${subtotal.toFixed(2)}</Text>
                                        </View>
                                    </View>

                                    {/* Checkout CTA */}
                                    <Pressable
                                        onPress={handleProceedToDelivery}
                                        style={({ pressed }) => [styles.limeCtaBtn, pressed && styles.pressed]}
                                    >
                                        <Text style={styles.limeCtaText}>Proceed to Checkout →</Text>
                                    </Pressable>
                                    <Text style={styles.secureBadge}>🔒 Secure, encrypted checkout</Text>
                                </>
                            )}
                        </>
                    )}

                    {/* ══════════════ STEP 2: DELIVERY ══════════════ */}
                    {step === 'delivery' && (
                        <View style={styles.flowSection}>
                            {/* Shipping Method Selector */}
                            <Text style={styles.fieldSectionTitle}>SHIPPING METHOD</Text>
                            {hasDeviceItem && (
                                <View style={styles.deviceNoticeBanner}>
                                    <Text style={styles.deviceNoticeIcon}>ℹ️</Text>
                                    <Text style={styles.deviceNoticeText}>
                                        Your cart contains a device add-on. Hardware accessories must be dispatched via delivery and cannot be picked up in person.
                                    </Text>
                                </View>
                            )}
                            <View style={styles.methodToggleRow}>
                                <Pressable
                                    onPress={() => setShippingMethod('delivery')}
                                    style={[
                                        styles.methodToggleBtn,
                                        shippingMethod === 'delivery' && styles.methodToggleBtnActive,
                                    ]}
                                >
                                    <Text style={styles.methodIcon}>🚚</Text>
                                    <Text
                                        style={[
                                            styles.methodText,
                                            shippingMethod === 'delivery' && styles.methodTextActive,
                                        ]}
                                    >
                                        Delivery
                                    </Text>
                                    <Text style={styles.methodSub}>To your door</Text>
                                </Pressable>

                                <Pressable
                                    disabled={hasDeviceItem}
                                    onPress={() => {
                                        if (hasDeviceItem) return;
                                        setShippingMethod('pickup');
                                    }}
                                    style={[
                                        styles.methodToggleBtn,
                                        shippingMethod === 'pickup' && styles.methodToggleBtnActive,
                                        hasDeviceItem && styles.methodToggleBtnDisabled,
                                    ]}
                                >
                                    <Text style={[styles.methodIcon, hasDeviceItem && styles.opacityMuted]}>🏬</Text>
                                    <Text
                                        style={[
                                            styles.methodText,
                                            shippingMethod === 'pickup' && styles.methodTextActive,
                                            hasDeviceItem && styles.methodTextDisabled,
                                        ]}
                                    >
                                        Pickup
                                    </Text>
                                    <Text style={styles.methodSub}>
                                        {hasDeviceItem ? 'Not available for device add-ons (Delivery only)' : 'Collect in person'}
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Delivery Address fields */}
                            {shippingMethod === 'delivery' ? (
                                <View style={styles.surfaceCard}>
                                    <Text style={styles.cardSectionLabel}>DELIVERY ADDRESS</Text>
                                    <TextInput
                                        onChangeText={setDeliveryPhone}
                                        placeholder="Phone number (for delivery SMS)"
                                        placeholderTextColor={colors.mutedForeground}
                                        style={styles.input}
                                        value={deliveryPhone}
                                    />
                                    <TextInput
                                        onChangeText={setAddrLine1}
                                        placeholder="Street address (e.g. 12 Wattle St)"
                                        placeholderTextColor={colors.mutedForeground}
                                        style={styles.input}
                                        value={addrLine1}
                                    />
                                    <TextInput
                                        onChangeText={setAddrLine2}
                                        placeholder="Apartment, suite, unit (optional)"
                                        placeholderTextColor={colors.mutedForeground}
                                        style={styles.input}
                                        value={addrLine2}
                                    />
                                    <View style={styles.twoCols}>
                                        <TextInput
                                            onChangeText={setAddrSuburb}
                                            placeholder="Suburb"
                                            placeholderTextColor={colors.mutedForeground}
                                            style={[styles.input, styles.flex1]}
                                            value={addrSuburb}
                                        />
                                        <TextInput
                                            onChangeText={setAddrPostcode}
                                            placeholder="Postcode"
                                            placeholderTextColor={colors.mutedForeground}
                                            style={[styles.input, styles.flex1]}
                                            value={addrPostcode}
                                        />
                                    </View>
                                </View>
                            ) : null}

                            {/* Dispenser Selector */}
                            <Text style={styles.fieldSectionTitle}>FULFILLING DISPENSER</Text>
                            {dispensersLoading ? (
                                <ActivityIndicator color={colors.primaryGreen} style={styles.myMd} />
                            ) : dispensers.length > 0 ? (
                                <View style={styles.dispenserList}>
                                    {dispensers.map((d) => {
                                        const dispenserIdNum = Number(d.id);
                                        const isSelected = Number(selectedDispenserId) === dispenserIdNum;
                                        const primaryName = d.headUserName || d.head_user || d.name;
                                        const secondaryName = (d.entityName || d.entity_name || (primaryName !== d.name ? d.name : null));

                                        return (
                                            <Pressable
                                                key={d.id}
                                                onPress={() => setSelectedDispenserId(dispenserIdNum)}
                                                style={[
                                                    styles.dispenserCard,
                                                    isSelected && styles.dispenserCardSelected,
                                                ]}
                                            >
                                                <View style={styles.dispenserHeader}>
                                                    <View style={styles.dispenserTitleWrap}>
                                                        <Text style={[styles.dispenserName, isSelected && styles.dispenserNameSelected]}>
                                                            {primaryName}
                                                        </Text>
                                                        {secondaryName && secondaryName !== primaryName ? (
                                                            <Text style={styles.dispenserEntity}>
                                                                {secondaryName}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                                </View>
                                                <Text style={styles.dispenserAddr}>
                                                    {d.line1}, {d.suburb} {d.state} {d.postCode || d.postcode}
                                                </Text>
                                                <View style={styles.dispenserBadgeRow}>
                                                    <View style={[styles.expressPostBadge, isSelected && styles.expressPostBadgeSelected]}>
                                                        <Text style={[styles.expressPostText, isSelected && styles.expressPostTextSelected]}>
                                                            📦 Australia Wide Express Post
                                                        </Text>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.surfaceCard}>
                                    <Text style={styles.mutedNote}>
                                        Dispensers will be auto-assigned upon checkout.
                                    </Text>
                                </View>
                            )}

                            {/* Payment Method Selector in Delivery */}
                            <Text style={styles.fieldSectionTitle}>PAYMENT METHOD</Text>
                            <View style={styles.payMethodRow}>
                                <Pressable
                                    onPress={() => setPaymentMethod('card')}
                                    style={[
                                        styles.payMethodOption,
                                        paymentMethod === 'card' && styles.payMethodOptionActive,
                                    ]}
                                >
                                    <View style={styles.payMethodHeader}>
                                        <Text style={styles.payMethodTitle}>Credit / Debit Card</Text>
                                        <Text style={styles.payMethodSub}>Instant Online</Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    onPress={() => setPaymentMethod('payid')}
                                    style={[
                                        styles.payMethodOption,
                                        paymentMethod === 'payid' && styles.payMethodOptionActive,
                                    ]}
                                >
                                    <View style={styles.payMethodHeader}>
                                        <Text style={styles.payMethodTitle}>PayID / Transfer</Text>
                                        <View style={styles.zeroFeeBadge}>
                                            <Text style={styles.zeroFeeText}>0% Fees!</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.payMethodSub}>Direct bank transfer</Text>
                                </Pressable>
                            </View>

                            {/* Pricing Summary */}
                            <OrderFeeSummaryCard
                                feeBreakdown={feeBreakdown}
                                paymentMethod={paymentMethod}
                                shippingMethod={shippingMethod}
                            />

                            {/* Action Buttons */}
                            <View style={styles.actionRow}>
                                <Pressable
                                    disabled={submitting}
                                    onPress={handleProceedToPayment}
                                    style={({ pressed }) => [styles.limeCtaBtn, pressed && styles.pressed]}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color={colors.primaryGreen} />
                                    ) : (
                                        <Text style={styles.limeCtaText}>
                                            {paymentMethod === 'payid'
                                                ? 'Get Payment Instructions →'
                                                : 'Proceed to Payment →'}
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* ══════════════ STEP 3: PAYMENT ══════════════ */}
                    {step === 'payment' && (
                        <View style={styles.flowSection}>
                            <View style={styles.surfaceCard}>
                                <Text style={styles.cardSectionLabel}>CARD PAYMENT</Text>

                                {/* Saved vs New Card Toggles */}
                                {savedCards.length > 0 && (
                                    <View style={styles.cardToggleTabs}>
                                        <Pressable
                                            onPress={() => setUseNewCard(false)}
                                            style={[styles.cardTab, !useNewCard && styles.cardTabActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.cardTabText,
                                                    !useNewCard && styles.cardTabTextActive,
                                                ]}
                                            >
                                                Saved Cards
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setUseNewCard(true)}
                                            style={[styles.cardTab, useNewCard && styles.cardTabActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.cardTabText,
                                                    useNewCard && styles.cardTabTextActive,
                                                ]}
                                            >
                                                New Card
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                                {!useNewCard && savedCards.length > 0 ? (
                                    <View style={styles.savedCardList}>
                                        {savedCards.map((card) => {
                                            const token = card.token || String(card.id);
                                            const isSelected = selectedCardToken === token;
                                            return (
                                                <Pressable
                                                    key={card.id}
                                                    onPress={() => setSelectedCardToken(token)}
                                                    style={[
                                                        styles.savedCardRow,
                                                        isSelected && styles.savedCardRowActive,
                                                    ]}
                                                >
                                                    <Text style={styles.savedCardIcon}>💳</Text>
                                                    <View style={styles.flex1}>
                                                        <Text style={styles.savedCardTitle}>
                                                            {card.brand.toUpperCase()} ···· {card.last4}
                                                        </Text>
                                                        <Text style={styles.savedCardExpiry}>
                                                            Expires {card.expMonth}/{card.expYear}
                                                        </Text>
                                                    </View>
                                                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <View style={styles.newCardForm}>
                                        <TextInput
                                            keyboardType="number-pad"
                                            maxLength={19}
                                            onChangeText={handleCardNumberChange}
                                            placeholder="Card Number (e.g. 4532 1234 5678 9010)"
                                            placeholderTextColor={colors.mutedForeground}
                                            style={styles.input}
                                            value={cardNumber}
                                        />
                                        <View style={styles.twoCols}>
                                            <TextInput
                                                keyboardType="number-pad"
                                                maxLength={5}
                                                onChangeText={handleCardExpiryChange}
                                                placeholder="MM/YY"
                                                placeholderTextColor={colors.mutedForeground}
                                                style={[styles.input, styles.flex1]}
                                                value={cardExpiry}
                                            />
                                            <TextInput
                                                keyboardType="number-pad"
                                                maxLength={3}
                                                onChangeText={handleCardCvvChange}
                                                placeholder="CVV"
                                                placeholderTextColor={colors.mutedForeground}
                                                style={[styles.input, styles.flex1]}
                                                value={cardCvv}
                                            />
                                        </View>

                                        <Pressable
                                            onPress={() => setSaveCardForFuture(!saveCardForFuture)}
                                            style={styles.saveCardCheckboxRow}
                                        >
                                            <View
                                                style={[
                                                    styles.checkboxBox,
                                                    saveCardForFuture && styles.checkboxBoxActive,
                                                ]}
                                            >
                                                {saveCardForFuture && <Text style={styles.checkIcon}>✓</Text>}
                                            </View>
                                            <Text style={styles.checkboxLabel}>
                                                Save this card securely for future refills
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>

                            {/* Final Breakdown */}
                            <OrderFeeSummaryCard
                                feeBreakdown={feeBreakdown}
                                paymentMethod={paymentMethod}
                                shippingMethod={shippingMethod}
                            />

                            {/* Pay Button */}
                            <Pressable
                                disabled={submitting}
                                onPress={() => executeCheckout()}
                                style={({ pressed }) => [
                                    styles.limeCtaBtn,
                                    pressed && styles.pressed,
                                    submitting && styles.btnDisabled,
                                ]}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={colors.primaryGreen} />
                                ) : (
                                    <Text style={styles.limeCtaText}>
                                        Pay ${Number(feeBreakdown?.total ?? subtotal).toFixed(2)} Now
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    actionRow: {
        marginTop: spacing.md,
    },
    backBtn: {
        alignItems: 'center',
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    backIcon: {
        color: colors.foreground,
        fontSize: 26,
        lineHeight: 26,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    cardSectionLabel: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    cardTab: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 10,
    },
    cardTabActive: {
        borderBottomColor: colors.primaryGreen,
        borderBottomWidth: 2,
    },
    cardTabText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontWeight: '600',
    },
    cardTabTextActive: {
        color: colors.primaryGreen,
        fontWeight: '700',
    },
    cardToggleTabs: {
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    checkIcon: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    checkMark: {
        color: colors.primaryGreen,
        fontSize: 16,
        fontWeight: '700',
    },
    checkboxBox: {
        alignItems: 'center',
        borderColor: colors.border,
        borderRadius: 4,
        borderWidth: 1.5,
        height: 18,
        justifyContent: 'center',
        width: 18,
    },
    checkboxBoxActive: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    checkboxLabel: {
        color: colors.foreground,
        fontSize: 13,
    },
    container: {
        backgroundColor: colors.background,
        flex: 1,
    },
    dispenserAddr: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    dispenserCard: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        padding: spacing.md,
    },
    dispenserCardSelected: {
        backgroundColor: '#f0fdf4',
        borderColor: colors.primaryGreen,
    },
    dispenserHeader: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dispenserTitleWrap: {
        flex: 1,
        marginRight: 8,
    },
    dispenserList: {
        gap: 8,
        marginBottom: spacing.md,
    },
    dispenserName: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    dispenserNameSelected: {
        color: colors.primaryGreen,
    },
    dispenserEntity: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    dispenserBadgeRow: {
        flexDirection: 'row',
        marginTop: 6,
    },
    expressPostBadge: {
        backgroundColor: colors.secondary,
        borderRadius: radii.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    expressPostBadgeSelected: {
        backgroundColor: '#dcfce7',
    },
    expressPostText: {
        color: colors.mutedForeground,
        fontSize: 11,
        fontWeight: '600',
    },
    expressPostTextSelected: {
        color: colors.primaryGreen,
    },
    emptyCard: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginTop: 40,
        paddingHorizontal: spacing.lg,
        paddingVertical: 48,
        ...shadows.tier1,
    },
    emptyIcon: {
        fontSize: 32,
    },
    emptyIconCircle: {
        alignItems: 'center',
        backgroundColor: colors.secondary,
        borderRadius: radii.full,
        height: 64,
        justifyContent: 'center',
        marginBottom: spacing.md,
        width: 64,
    },
    emptySub: {
        color: colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.lg,
        marginTop: 6,
        textAlign: 'center',
    },
    emptyTitle: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    fieldSectionTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginTop: spacing.sm,
    },
    flex1: {
        flex: 1,
    },
    flowSection: {
        gap: 6,
    },
    header: {
        alignItems: 'center',
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 14 : 10,
        paddingBottom: 10,
    },
    headerCount: {
        color: colors.mutedForeground,
        fontSize: 15,
        fontWeight: '500',
    },
    headerTitle: {
        color: colors.foreground,
        fontSize: 17,
        fontWeight: '700',
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: 6,
    },
    input: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        color: colors.foreground,
        fontSize: 13,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    limeCtaBtn: {
        alignItems: 'center',
        backgroundColor: colors.accentLime,
        borderRadius: radii.xl,
        justifyContent: 'center',
        marginTop: spacing.md,
        paddingVertical: 16,
        ...shadows.tier2,
    },
    limeCtaText: {
        color: '#064e3b',
        fontFamily: typography.extraBold,
        fontSize: 16,
        letterSpacing: 0.3,
    },
    loaderText: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 10,
    },
    loaderWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    boldText: {
        fontWeight: '700',
    },
    deviceNoticeBanner: {
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.sm,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    deviceNoticeIcon: {
        fontSize: 16,
    },
    deviceNoticeText: {
        color: '#92400e',
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    methodIcon: {
        fontSize: 22,
        marginBottom: 2,
    },
    methodSub: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    methodText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    methodTextActive: {
        color: colors.primaryGreen,
    },
    methodTextDisabled: {
        color: colors.mutedForeground,
    },
    methodToggleBtn: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        flex: 1,
        gap: 2,
        paddingVertical: 14,
    },
    methodToggleBtnActive: {
        backgroundColor: '#f0fdf4',
        borderColor: colors.primaryGreen,
    },
    methodToggleBtnDisabled: {
        backgroundColor: '#f3f4f6',
        borderColor: '#e5e7eb',
        opacity: 0.65,
    },
    opacityMuted: {
        opacity: 0.45,
    },
    methodToggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.md,
    },
    mutedNote: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontStyle: 'italic',
    },
    myMd: {
        marginVertical: spacing.md,
    },
    newCardForm: {
        gap: 2,
    },
    payMethodHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    payMethodOption: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        flex: 1,
        gap: 4,
        padding: spacing.md,
    },
    payMethodOptionActive: {
        backgroundColor: '#f0fdf4',
        borderColor: colors.primaryGreen,
    },
    payMethodRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.md,
    },
    payMethodSub: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    payMethodTitle: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.8,
    },
    primaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        paddingHorizontal: 24,
        paddingVertical: 13,
    },
    primaryBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    saveCardCheckboxRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    savedCardExpiry: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    savedCardIcon: {
        fontSize: 20,
    },
    savedCardList: {
        gap: 8,
    },
    savedCardRow: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        padding: 12,
    },
    savedCardRowActive: {
        backgroundColor: '#f0fdf4',
        borderColor: colors.primaryGreen,
    },
    savedCardTitle: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    scrollPad: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    secureBadge: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 8,
        textAlign: 'center',
    },
    summaryDivider: {
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        height: 1,
        marginVertical: 10,
    },
    summaryLabel: {
        color: colors.mutedForeground,
        fontFamily: typography.medium,
        fontSize: 13,
    },
    summaryMuted: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 12,
        fontStyle: 'italic',
    },
    summaryRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    summaryTotalLabel: {
        color: colors.foreground,
        fontFamily: typography.bold,
        fontSize: 15,
    },
    summaryTotalValue: {
        color: colors.primaryGreen,
        fontFamily: typography.extraBold,
        fontSize: 20,
    },
    summaryValue: {
        color: colors.foreground,
        fontFamily: typography.semiBold,
        fontSize: 14,
    },
    surfaceCard: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.07)',
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginBottom: spacing.md,
        padding: spacing.lg,
        ...shadows.tier1,
    },
    twoCols: {
        flexDirection: 'row',
        gap: 8,
    },
    zeroFeeBadge: {
        backgroundColor: '#dcfce7',
        borderRadius: radii.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    zeroFeeText: {
        color: colors.statusEmerald,
        fontSize: 9,
        fontWeight: '700',
    },
});
