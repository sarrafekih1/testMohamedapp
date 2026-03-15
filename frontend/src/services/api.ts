// src/services/api.ts
import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User,
  Topic,
  TopicCreate,
  Document,
  Conversation,
  ChatResponse,
  ConversationCreate,
  ConversationUpdate,
  MessageSend,
  UserListItem,
  UserDetail,
  UserUpdate,
  UserStats,
  UserPermissions,
  UserRoleUpdate,
  TopicPermission,
  GrantPermissionRequest,
  UpdatePermissionRequest,
  UserBasic
} from '../types/api'

class ApiService {
  private api: AxiosInstance
  private baseURL: string

  constructor() {
    // this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Intercepteur pour ajouter le token automatiquement
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // 🔐 AUTHENTIFICATION
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', userData)
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<User>('/auth/me')
    return response.data
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  // 📁 TOPICS
  async getTopics(): Promise<Topic[]> {
    const response = await this.api.get<Topic[]>('/topics')
    return response.data
  }

  async getTopic(id: string): Promise<Topic> {
    const response = await this.api.get<Topic>(`/topics/${id}`)
    return response.data
  }

  async createTopic(data: TopicCreate): Promise<Topic> {
    const response = await this.api.post<Topic>('/topics', data)
    return response.data
  }

  async updateTopic(id: string, data: Partial<TopicCreate>): Promise<Topic> {
    const response = await this.api.patch<Topic>(`/topics/${id}`, data)
    return response.data
  }

  // 📄 DOCUMENTS
  async getDocuments(topicId: string): Promise<{ documents: Document[], total: number }> {
    const response = await this.api.get(`/documents?topic_id=${topicId}`)
    return response.data
  }

  async uploadDocument(topicId: string, file: File): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('topic_id', topicId)

    const response = await this.api.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async deleteDocument(id: string): Promise<void> {
    await this.api.delete(`/documents/${id}`)
  }

  // 💬 CHAT - Méthodes principales
  async createConversation(data: ConversationCreate): Promise<Conversation> {
    const response = await this.api.post<Conversation>('/chat', data)
    return response.data
  }

  async getConversations(): Promise<Conversation[]> {
    const response = await this.api.get<Conversation[]>('/chat')
    return response.data
  }

  async getConversation(conversationId: string): Promise<Conversation & { messages: any[] }> {
    const response = await this.api.get(`/chat/${conversationId}`)
    return response.data
  }

  async updateConversation(conversationId: string, data: ConversationUpdate): Promise<Conversation> {
    const response = await this.api.patch<Conversation>(`/chat/${conversationId}`, data)
    return response.data
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.api.delete(`/chat/${conversationId}`)
  }

  async sendMessage(conversationId: string, content: string): Promise<ChatResponse> {
    const response = await this.api.post<ChatResponse>(`/chat/${conversationId}/messages`, {
      content
    })
    return response.data
  }

  // 👥 USERS - Gestion des utilisateurs
  async getUsers(params?: {
    skip?: number
    limit?: number
    role?: 'user' | 'manager' | 'admin'
    is_active?: boolean
    search?: string
  }): Promise<UserListItem[]> {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.role) queryParams.append('role', params.role)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    if (params?.search) queryParams.append('search', params.search)
    
    const response = await this.api.get<UserListItem[]>(`/users?${queryParams}`)
    return response.data
  }

  async getUserById(userId: string): Promise<UserDetail> {
    const response = await this.api.get<UserDetail>(`/users/${userId}`)
    return response.data
  }

  async updateUser(userId: string, data: UserUpdate): Promise<UserDetail> {
    const response = await this.api.patch<UserDetail>(`/users/${userId}`, data)
    return response.data
  }

  async updateUserRole(userId: string, data: UserRoleUpdate): Promise<UserDetail> {
    const response = await this.api.patch<UserDetail>(`/users/${userId}/role`, data)
    return response.data
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}`)
  }

  async getUserStats(): Promise<UserStats> {
    const response = await this.api.get<UserStats>('/users/stats')
    return response.data
  }

  async getUserPermissions(): Promise<UserPermissions> {
    const response = await this.api.get<UserPermissions>('/users/me/permissions')
    return response.data
  }

  // 🔐 PERMISSIONS GRANULAIRES PAR TOPIC
  async getTopicPermissions(topicId: string): Promise<TopicPermission[]> {
    const response = await this.api.get<TopicPermission[]>(`/topics/${topicId}/permissions`)
    return response.data
  }

  async grantTopicPermission(topicId: string, data: GrantPermissionRequest): Promise<TopicPermission> {
    const response = await this.api.post<TopicPermission>(`/topics/${topicId}/permissions`, data)
    return response.data
  }

  async revokeTopicPermission(topicId: string, userId: string): Promise<void> {
    await this.api.delete(`/topics/${topicId}/permissions/${userId}`)
  }

  async updateTopicPermission(
    topicId: string, 
    userId: string, 
    data: UpdatePermissionRequest
  ): Promise<TopicPermission> {
    const response = await this.api.patch<TopicPermission>(
      `/topics/${topicId}/permissions/${userId}`, 
      data
    )
    return response.data
  }

  async getAvailableUsersForTopic(topicId: string, search?: string): Promise<UserBasic[]> {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    
    const response = await this.api.get<UserBasic[]>(
      `/topics/${topicId}/available-users?${params}`
    )
    return response.data
  }



  // 📊 UTILITAIRES
  async getHealthStatus(): Promise<any> {
    const response = await this.api.get('/chat/health/system')
    return response.data
  }

  async testRAG(query: string, topicId?: string): Promise<any> {
    const response = await this.api.post('/chat/test/rag', { 
      query,
      topic_id: topicId 
    })
    return response.data
  }

  async getUserChatStats(): Promise<any> {
    const response = await this.api.get('/chat/stats/user')
    return response.data
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService