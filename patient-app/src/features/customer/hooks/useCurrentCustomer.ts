import { useQuery } from '@tanstack/react-query';
import { fetchCurrentCustomer } from '../api/customer.api';

export function useCurrentCustomer() {
    return useQuery({
        queryKey: ['profile', 'me'],
        queryFn: fetchCurrentCustomer,
        staleTime: 5 * 60_000, // profile data changes far less often than dashboard data
    });
}