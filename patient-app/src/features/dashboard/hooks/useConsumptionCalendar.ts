import { useQuery } from '@tanstack/react-query';
import { fetchConsumptionCalendar } from '../api/dashboard.api';

export function useConsumptionCalendar() {
    return useQuery({
        queryKey: ['dashboard', 'consumption-calendar'],
        queryFn: fetchConsumptionCalendar,
        staleTime: 1000 * 60 * 5,
    });
}
