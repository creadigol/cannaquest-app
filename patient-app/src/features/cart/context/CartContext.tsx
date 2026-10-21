import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCart } from '../api/cart.api';
import type { CartData, CartItem } from '../api/cart.types';

interface CartContextValue {
    cart: CartData | null;
    cartCount: number;
    isLoading: boolean;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
    cart: null,
    cartCount: 0,
    isLoading: false,
    refreshCart: async () => {},
});

import { useAuth } from '@/features/auth/auth.context';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state } = useAuth();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshCart = useCallback(async () => {
        if (state.status !== 'authenticated') {
            setCart(null);
            return;
        }
        try {
            setIsLoading(true);
            const data = await getCart();
            setCart(data);
        } catch {
            // Non-blocking if unauthenticated or network error
        } finally {
            setIsLoading(false);
        }
    }, [state.status]);

    useEffect(() => {
        if (state.status === 'authenticated') {
            refreshCart();
        } else {
            setCart(null);
        }
    }, [state.status, refreshCart]);

    // Distinct product count in cart (not total units/quantities)
    const cartCount = (cart?.items || []).length;

    return (
        <CartContext.Provider value={{ cart, cartCount, isLoading, refreshCart }}>
            {children}
        </CartContext.Provider>
    );
};

export function useCart() {
    return useContext(CartContext);
}
