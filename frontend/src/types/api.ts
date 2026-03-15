// src/types/api.ts
// Types correspondant aux APIs backend RAG

export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  role: 'user' | 'manager' | 'admin'
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  full_name: string
  password: string
}

export interface Topic {
  id: string
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TopicCreate {
  name: string
  description?: string
}

export interface Document {
  id: string
  filename: string
  original_filename: string
  content_type: string
  file_size: number
  status: 'uploading' | 'processing' | 'ready' | 'error'
  error_message?: string
  total_chunks: number
  topic_id: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

// ✅ AJOUT topic_ids pour Conversation
export interface Conversation {
  id: string
  title: string
  user_id: string
  message_count: number
  topic_ids?: string[]  // ✅ Ajouté - utilisé par historyStore
  topics?: Topic[]      // ✅ Ajouté - pour les relations enrichies
  messages?: Message[]  // ✅ Ajouté - pour loadConversation
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  content: string
  is_from_user: boolean
  sources?: MessageSource[]
  processing_time?: number
  token_count?: number
  conversation_id: string
  created_at: string
  updated_at?: string
}

export interface ChatResponse {
  user_message: {
    id: string
    content: string
    timestamp: string
  }
  ai_response: {
    id: string
    content: string
    sources: MessageSource[]
    processing_time_ms: number
    token_count: number
    timestamp: string
  }
  context_info: {
    rag_results_found: number
    topics_searched: number
    model_used: string
    success: boolean
  }
}

// Types supplémentaires pour les requêtes chat
export interface ConversationCreate {
  topic_ids: string[]
  title?: string
}

export interface MessageSend {
  content: string
}

export interface ConversationUpdate {
  title: string
}

// Types pour UI/UX
export interface TypingIndicator {
  isVisible: boolean
  text: string
}

export interface ChatError {
  message: string
  code?: string
  retry?: boolean
}

// Types pour sources détaillées
export interface MessageSource {
  document_id: string
  document_name: string
  topic_name: string
  chunk_index: number
  page_number?: number
  similarity_score: number
}

// Types utilitaires
export interface ApiError {
  detail: string
  error_code?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// ✅ AJOUT - Types pour API getDocuments (structure attendue)
export interface DocumentsResponse {
  documents: Document[]
  total: number
  skip: number
  limit: number
}


// ============================================
// TYPES GESTION UTILISATEURS
// ============================================

export interface UserListItem {
  id: string
  email: string
  full_name: string
  role: 'user' | 'manager' | 'admin'
  is_active: boolean
  created_at: string
}

export interface UserDetail {
  id: string
  email: string
  full_name: string
  role: 'user' | 'manager' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface UserUpdate {
  full_name?: string
  is_active?: boolean
}

export interface UserRoleUpdate {
  role: 'user' | 'manager' | 'admin'
}

export interface UserStats {
  total_users: number
  admins_count: number
  managers_count: number
  users_count: number
  active_users: number
  inactive_users: number
}

export interface UserPermissions {
  user_id: string
  role: 'user' | 'manager' | 'admin'
  permissions: {
    can_create_topic: boolean
    can_delete_topic: boolean
    can_manage_users: boolean
    can_view_all_topics: boolean
    can_view_all_users: boolean
    can_change_user_role: boolean
    can_deactivate_user: boolean
    can_delete_any_document: boolean
  }
}

// ============================================
// TYPES PERMISSIONS GRANULAIRES PAR TOPIC
// ============================================

export type PermissionLevel = 'read' | 'write' | 'admin'

export interface TopicPermission {
  id: string
  user_id: string
  topic_id: string
  permission: PermissionLevel
  granted_by: string
  user: {
    id: string
    email: string
    full_name: string
  }
  grantor?: {
    id: string
    email: string
    full_name: string
  }
  created_at: string
  updated_at: string
}

export interface GrantPermissionRequest {
  user_id: string
  permission: PermissionLevel
}

export interface UpdatePermissionRequest {
  permission: PermissionLevel
}

export interface UserBasic {
  id: string
  email: string
  full_name: string
}