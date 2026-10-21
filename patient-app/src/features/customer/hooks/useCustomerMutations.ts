import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    clearCustomerSignature,
    deleteCustomerPaymentMethod,
    fetchCurrentCustomer,
    fetchCustomerDocuments,
    fetchCustomerPaymentMethods,
    saveCustomerSignature,
    updateCustomerAddress,
    updateCustomerProfile,
} from '../api/customer.api';
import type { SaveSignatureDto, UpdateAddressDto, UpdateProfileDto } from '../api/customer.types';

export function useCustomerProfile() {
    return useQuery({
        queryKey: ['profile', 'me'],
        queryFn: fetchCurrentCustomer,
        staleTime: 5 * 60_000,
    });
}

export function useUpdateCustomerProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateProfileDto) => updateCustomerProfile(data),
        onSuccess: (updatedCustomer) => {
            queryClient.setQueryData(['profile', 'me'], updatedCustomer);
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        },
    });
}

export function useUpdateCustomerAddress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateAddressDto) => updateCustomerAddress(data),
        onSuccess: (updatedCustomer) => {
            queryClient.setQueryData(['profile', 'me'], updatedCustomer);
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        },
    });
}

export function useSaveCustomerSignature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SaveSignatureDto) => saveCustomerSignature(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        },
    });
}

export function useClearCustomerSignature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => clearCustomerSignature(),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        },
    });
}

export function useCustomerDocuments() {
    return useQuery({
        queryKey: ['profile', 'documents'],
        queryFn: fetchCustomerDocuments,
        staleTime: 60_000,
    });
}

export function useCustomerPaymentMethods() {
    return useQuery({
        queryKey: ['profile', 'payment-methods'],
        queryFn: fetchCustomerPaymentMethods,
        staleTime: 60_000,
    });
}

export function useDeletePaymentMethod() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => deleteCustomerPaymentMethod(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile', 'payment-methods'] });
        },
    });
}

