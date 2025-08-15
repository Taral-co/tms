import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query'
import { 
  Ticket, 
  User, 
  Customer, 
  Agent, 
  Integration,
  Notification,
  PaginatedResponse,
  TicketFilters,
  BaseQueryParams,
  CreateTicketRequest,
  UpdateTicketRequest,
  LoginRequest,
  LoginResponse
} from '../types/api'
import { apiClient, ApiClientError } from './api-client'

// Query Keys
export const queryKeys = {
  // Auth
  auth: ['auth'] as const,
  me: () => [...queryKeys.auth, 'me'] as const,
  
  // Tickets
  tickets: ['tickets'] as const,
  ticketsList: (filters?: TicketFilters & BaseQueryParams) => 
    [...queryKeys.tickets, 'list', filters] as const,
  ticketDetail: (id: string) => 
    [...queryKeys.tickets, 'detail', id] as const,
  ticketMessages: (id: string, params?: BaseQueryParams) => 
    [...queryKeys.tickets, id, 'messages', params] as const,
  
  // Users & Agents
  users: ['users'] as const,
  agents: ['agents'] as const,
  agentsList: (params?: BaseQueryParams) => 
    [...queryKeys.agents, 'list', params] as const,
  
  // Customers
  customers: ['customers'] as const,
  customersList: (params?: BaseQueryParams) => 
    [...queryKeys.customers, 'list', params] as const,
  customerDetail: (id: string) => 
    [...queryKeys.customers, 'detail', id] as const,
  
  // Integrations
  integrations: ['integrations'] as const,
  integrationsList: (params?: BaseQueryParams) => 
    [...queryKeys.integrations, 'list', params] as const,
  integrationDetail: (id: string) => 
    [...queryKeys.integrations, 'detail', id] as const,
  
  // Notifications
  notifications: ['notifications'] as const,
  notificationsList: (params?: BaseQueryParams) => 
    [...queryKeys.notifications, 'list', params] as const,
  unreadCount: () => 
    [...queryKeys.notifications, 'unread-count'] as const,
} as const

// Auth Hooks
export function useLogin(
  options?: UseMutationOptions<LoginResponse, ApiClientError, LoginRequest>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
      return response.data
    },
    onSuccess: (data) => {
      // Set auth token
      apiClient.setAuthToken(data.access_token)
      
      // Cache user data
      queryClient.setQueryData(queryKeys.me(), data.user)
      
      // Invalidate auth queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth })
    },
    ...options,
  })
}

export function useLogout(
  options?: UseMutationOptions<void, ApiClientError, void>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear()
    },
    ...options,
  })
}

export function useMe(
  options?: UseQueryOptions<User, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/me')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// Ticket Hooks
export function useTickets(
  filters?: TicketFilters & BaseQueryParams,
  options?: UseQueryOptions<PaginatedResponse<Ticket>, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.ticketsList(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Ticket>>('/tickets', {
        params: filters
      })
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

export function useTicket(
  id: string,
  options?: UseQueryOptions<Ticket, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.ticketDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Ticket>(`/tickets/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  })
}

export function useCreateTicket(
  options?: UseMutationOptions<Ticket, ApiClientError, CreateTicketRequest>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateTicketRequest) => {
      const response = await apiClient.post<Ticket>('/tickets', data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
    },
    ...options,
  })
}

export function useUpdateTicket(
  options?: UseMutationOptions<Ticket, ApiClientError, { id: string; data: UpdateTicketRequest }>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTicketRequest }) => {
      const response = await apiClient.patch<Ticket>(`/tickets/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      // Update ticket detail cache
      queryClient.setQueryData(queryKeys.ticketDetail(data.id), data)
      
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
    },
    ...options,
  })
}

// Agent Hooks
export function useAgents(
  params?: BaseQueryParams,
  options?: UseQueryOptions<PaginatedResponse<Agent>, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.agentsList(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Agent>>('/agents', {
        params
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// Customer Hooks
export function useCustomers(
  params?: BaseQueryParams,
  options?: UseQueryOptions<PaginatedResponse<Customer>, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.customersList(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', {
        params
      })
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

export function useCustomer(
  id: string,
  options?: UseQueryOptions<Customer, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.customerDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// Integration Hooks
export function useIntegrations(
  params?: BaseQueryParams,
  options?: UseQueryOptions<PaginatedResponse<Integration>, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.integrationsList(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Integration>>('/integrations', {
        params
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

export function useIntegration(
  id: string,
  options?: UseQueryOptions<Integration, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.integrationDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Integration>(`/integrations/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// Notification Hooks
export function useNotifications(
  params?: BaseQueryParams,
  options?: UseQueryOptions<PaginatedResponse<Notification>, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.notificationsList(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
        params
      })
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

export function useUnreadNotificationCount(
  options?: UseQueryOptions<number, ApiClientError>
) {
  return useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>('/notifications/unread-count')
      return response.data.count
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  })
}

export function useMarkNotificationRead(
  options?: UseMutationOptions<void, ApiClientError, string>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`)
    },
    onSuccess: () => {
      // Invalidate notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() })
    },
    ...options,
  })
}

// Prefetch utilities
export function usePrefetchTicket() {
  const queryClient = useQueryClient()
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.ticketDetail(id),
      queryFn: async () => {
        const response = await apiClient.get<Ticket>(`/tickets/${id}`)
        return response.data
      },
      staleTime: 60 * 1000,
    })
  }
}
