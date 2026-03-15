// src/types/chat.ts

// Types pour le système conversationnel - alignés avec backend FastAPI

// fichier a supprimer. Tout est deja dans ../api.ts

export interface Conversation {
  id: string
  title: string
  user_id: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface ConversationTopic {
  id: string
  conversation_id: string
  topic_id: string
  added_at: string
}

export interface Message {
  id: string
  content: string
  is_from_user: boolean
  sources?: MessageSource[]
  processing_time?: number // en millisecondes
  token_count?: number
  conversation_id: string
  created_at: string
  updated_at: string
}

export interface MessageSource {
  document_id: string
  document_name: string
  topic_name: string
  chunk_index: number
  page_number?: number
  similarity_score: number
}

export interface ChatResponse {
  message: Message
  conversation: Conversation
  sources_count: number
  processing_time: number
  token_count: number
}

// Types pour les requêtes API
export interface ConversationCreate {
  topic_ids: string[] // Support multi-topics
  title?: string
}

export interface MessageSend {
  content: string
}

export interface ConversationUpdate {
  title: string
}

// Types pour les réponses API
export interface ConversationsListResponse {
  conversations: Conversation[]
  total: number
  skip: number
  limit: number
}

export interface ConversationDetailResponse {
  conversation: Conversation
  messages: Message[]
  topics: {
    id: string
    name: string
  }[]
}

// Types pour les statistiques chat
export interface ChatStats {
  total_conversations: number
  total_messages: number
  avg_processing_time: number
  total_tokens: number
}

// Types pour le health check
export interface ChatHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  llm_status: 'ready' | 'loading' | 'error'
  rag_status: 'ready' | 'error'
  embeddings_status: 'ready' | 'error'
  qdrant_status: 'ready' | 'error'
  details?: string
}

// Types utilitaires
export type MessageRole = 'user' | 'assistant'

export interface TypingIndicator {
  isVisible: boolean
  text: string
}

export interface ChatError {
  message: string
  code?: string
  retry?: boolean
}