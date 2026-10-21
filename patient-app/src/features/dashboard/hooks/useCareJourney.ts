import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dismissCareJourney, fetchCareJourney } from '../api/dashboard.api';

export function useCareJourney() {
  return useQuery({
    queryKey: ['dashboard', 'care-journey'],
    queryFn: fetchCareJourney,
    staleTime: 60_000,
  });
}

export function useDismissCareJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissCareJourney,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'care-journey'] });
    },
  });
}
