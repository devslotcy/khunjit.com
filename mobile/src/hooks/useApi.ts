import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';

// Patient Stats
export function usePatientStats() {
  return useQuery({
    queryKey: ['patient-stats'],
    queryFn: () =>
      apiRequest<{
        totalSessions: number;
        upcomingCount: number;
        unreadMessages: number;
      }>('/api/patient/stats', { requireAuth: true }),
  });
}

// Psychologist Stats
export function usePsychologistStats() {
  return useQuery({
    queryKey: ['psychologist-stats'],
    queryFn: () =>
      apiRequest<{
        todaySessions: number;
        weeklyEarnings: number;
        totalPatients: number;
        pendingAppointments: number;
        upcomingCount?: number; // For backward compatibility
        totalSessions?: number; // For backward compatibility
        totalEarnings?: number; // For backward compatibility
        unreadMessages?: number;
      }>('/api/psychologist/stats', { requireAuth: true }),
  });
}

// Appointments
export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiRequest<any[]>('/api/appointments', { requireAuth: true }),
  });
}

// Upcoming Appointments (Web compatible)
export function useUpcomingAppointments() {
  return useQuery({
    queryKey: ['appointments-upcoming'],
    queryFn: () => apiRequest<any[]>('/api/appointments/upcoming', { requireAuth: true }),
  });
}

// Single Appointment
export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => apiRequest<any>(`/api/appointments/${id}`, { requireAuth: true }),
    enabled: !!id,
  });
}

// Psychologists List
export function usePsychologists() {
  return useQuery({
    queryKey: ['psychologists'],
    queryFn: () => apiRequest<any[]>('/api/psychologists', { requireAuth: true }),
  });
}

// Single Psychologist
export function usePsychologist(id: string) {
  return useQuery({
    queryKey: ['psychologist', id],
    queryFn: () => apiRequest<any>(`/api/psychologists/${id}`, { requireAuth: true }),
    enabled: !!id,
  });
}

// Messages / Conversations (Web-aligned)
export function useConversations() {
  return useQuery({
    queryKey: ['/api/conversations'],
    queryFn: () => apiRequest<any[]>('/api/conversations', { requireAuth: true }),
    refetchInterval: 10000, // Poll every 10 seconds like web
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    queryFn: () => apiRequest<any[]>(`/api/conversations/${conversationId}/messages`, { requireAuth: true }),
    enabled: !!conversationId,
    staleTime: 0,
    refetchInterval: 3000, // Poll for new messages every 3 seconds like web
  });
}

// Send Message (Web-aligned)
export function useSendMessageToConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      apiRequest<any>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { text },
        requireAuth: true,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${variables.conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
}

// Availability Slots (Time Slot Management)
export function useAvailabilitySlots(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return useQuery({
    queryKey: ['/api/availability/slots', startDate, endDate],
    queryFn: () => apiRequest<any[]>(`/api/availability/slots?${params.toString()}`, { requireAuth: true }),
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateAvailabilitySlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { date: string; customSlots: any; isOff?: boolean; reason?: string }) =>
      apiRequest<any>('/api/availability/slots', {
        method: 'POST',
        body: data,
        requireAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/availability/slots'] });
    },
  });
}

export function useDeleteAvailabilitySlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) =>
      apiRequest(`/api/availability/slots/${slotId}`, {
        method: 'DELETE',
        requireAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/availability/slots'] });
    },
  });
}

// Backward compatibility - kept for old code
export function useMessages(recipientId: string) {
  return useQuery({
    queryKey: ['messages', recipientId],
    queryFn: () => apiRequest<any[]>(`/api/messages/${recipientId}`, { requireAuth: true }),
    enabled: !!recipientId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipientId, content }: { recipientId: string; content: string }) =>
      apiRequest<any>('/api/messages', {
        method: 'POST',
        body: { recipientId, content },
        requireAuth: true,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.recipientId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Availability (Psychologist) - matches web exactly
export function useAvailabilityRules() {
  return useQuery({
    queryKey: ['/api/availability/rules'],
    queryFn: () => apiRequest<any[]>('/api/availability/rules', { requireAuth: true }),
  });
}

export function useSaveAvailabilityRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { rules: any[]; slotDuration: number }) =>
      apiRequest<any>('/api/availability/rules', {
        method: 'POST',
        body: data,
        requireAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/availability/rules'] });
    },
  });
}

// Cancel Appointment
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      apiRequest<any>(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        requireAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-stats'] });
      queryClient.invalidateQueries({ queryKey: ['psychologist-stats'] });
    },
  });
}

// Book Appointment
export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { psychologistId: string; scheduledAt: string }) =>
      apiRequest<any>('/api/appointments', {
        method: 'POST',
        body: data,
        requireAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-stats'] });
    },
  });
}

// Update Profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>('/api/profile', {
        method: 'PATCH',
        body: data,
        requireAuth: true,
      }),
    onSuccess: (updatedProfile) => {
      // Update the cached profile immediately
      queryClient.setQueryData(['profile'], updatedProfile);
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Profile
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiRequest<any>('/api/profile', { requireAuth: true }),
  });
}

// Psychologist Profile (for psychologist user)
export function usePsychologistProfile() {
  return useQuery({
    queryKey: ['psychologist-profile'],
    queryFn: () => apiRequest<any>('/api/psychologist/profile', { requireAuth: true }),
  });
}
