import type { 
  ApiClient, 
  ApiResponse, 
  ApiError, 
  RequestConfig,
  TenantContext 
} from '../types/api'

export class ApiClientError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly field?: string
  public readonly details?: string

  constructor(error: ApiError & { status: number }) {
    super(error.error)
    this.name = 'ApiClientError'
    this.status = error.status
    this.code = error.code
    this.field = error.field
    this.details = error.details
  }
}

export class TmsApiClient implements ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private tenantContext?: TenantContext

  constructor(
    baseURL: string,
    defaultHeaders: Record<string, string> = {},
    tenantContext?: TenantContext
  ) {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
    this.tenantContext = tenantContext
  }

  setAuthToken(token: string) {
    this.defaultHeaders.Authorization = `Bearer ${token}`
  }

  setTenantContext(context: TenantContext) {
    this.tenantContext = context
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`)
    
    // Add tenant context to all requests
    if (this.tenantContext?.tenantId) {
      url.searchParams.set('tenant_id', this.tenantContext.tenantId)
    }
    if (this.tenantContext?.projectId) {
      url.searchParams.set('project_id', this.tenantContext.projectId)
    }

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)))
          } else {
            url.searchParams.set(key, String(value))
          }
        }
      })
    }

    return url.toString()
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      let errorData: ApiError
      
      if (isJson) {
        errorData = await response.json()
      } else {
        errorData = {
          error: response.statusText || 'An error occurred',
          details: `HTTP ${response.status}`
        }
      }

      throw new ApiClientError({
        ...errorData,
        status: response.status
      })
    }

    if (isJson) {
      return await response.json()
    }

    // For non-JSON responses, wrap in ApiResponse format
    return {
      data: await response.text() as T,
      success: true
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        ...config?.headers
      },
      signal: config?.signal,
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        ...config?.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.defaultHeaders,
        ...config?.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...this.defaultHeaders,
        ...config?.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...this.defaultHeaders,
        ...config?.headers
      },
      signal: config?.signal,
    })

    return this.handleResponse<T>(response)
  }
}

// Environment variable fallback for different bundlers
const getApiBaseUrl = (): string => {
  // Check for global env variables that may be set by bundler
  if (typeof globalThis !== 'undefined' && (globalThis as any).__ENV__?.VITE_API_BASE_URL) {
    return (globalThis as any).__ENV__.VITE_API_BASE_URL
  }
  
  // Default fallback
  return 'http://localhost:8080/api/v1'
}

// Default API client instance
const apiClient = new TmsApiClient(getApiBaseUrl())

export { apiClient }
export default apiClient
