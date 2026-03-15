// src/stores/topicsStore.ts
import { create } from 'zustand'
import { apiService } from '../services/api'
import type { Topic, TopicCreate } from '../types/api'

interface TopicsStore {
  // State
  topics: Topic[]
  selectedTopic: Topic | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchTopics: () => Promise<void>
  fetchTopicById: (id: string) => Promise<Topic>
  createTopic: (data: TopicCreate) => Promise<Topic>
  updateTopic: (id: string, data: Partial<TopicCreate>) => Promise<Topic>
  selectTopic: (topic: Topic | null) => void
  clearError: () => void
}

export const useTopicsStore = create<TopicsStore>((set, get) => ({
  // État initial
  topics: [],
  selectedTopic: null,
  isLoading: false,
  error: null,

  // FETCH TOPICS
  fetchTopics: async () => {
    set({ isLoading: true, error: null })
    try {
      const topics = await apiService.getTopics()
      set({
        topics,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des topics'
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  // FETCH TOPIC BY ID
  fetchTopicById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const topic = await apiService.getTopic(id)
      set(state => ({
        topics: state.topics.some(t => t.id === id)
          ? state.topics.map(t => t.id === id ? topic : t)
          : [...state.topics, topic],
        isLoading: false,
        error: null
      }))
      return topic
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement du topic'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // CREATE TOPIC
  createTopic: async (data: TopicCreate) => {
    set({ isLoading: true, error: null })
    try {
      const newTopic = await apiService.createTopic(data)
      // Ajouter le nouveau topic à la liste
      set(state => ({
        topics: [newTopic, ...state.topics],
        isLoading: false,
        error: null
      }))
      return newTopic
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la création du topic'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // UPDATE TOPIC
  updateTopic: async (id: string, data: Partial<TopicCreate>) => {
    set({ isLoading: true, error: null })
    try {
      const updatedTopic = await apiService.updateTopic(id, data)
      // Mettre à jour le topic dans la liste
      set(state => ({
        topics: state.topics.map(topic =>
          topic.id === id ? updatedTopic : topic
        ),
        selectedTopic: state.selectedTopic?.id === id ? updatedTopic : state.selectedTopic,
        isLoading: false,
        error: null
      }))
      return updatedTopic
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la mise à jour du topic'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // SELECT TOPIC
  selectTopic: (topic: Topic | null) => {
    set({ selectedTopic: topic })
  },

  // CLEAR ERROR
  clearError: () => {
    set({ error: null })
  },
}))

// ✅ HOOK EXPORT - C'est ce qui manquait !
export const useTopics = () => {
  const store = useTopicsStore()
  return {
    // État
    topics: store.topics,
    selectedTopic: store.selectedTopic,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    fetchTopics: store.fetchTopics,
    fetchTopicById: store.fetchTopicById,
    createTopic: store.createTopic,
    updateTopic: store.updateTopic,
    selectTopic: store.selectTopic,
    clearError: store.clearError,
  }
}

// Hook utilitaire pour récupérer un topic par ID
export const useTopicById = (id: string) => {
  const topics = useTopicsStore(state => state.topics)
  return topics.find(topic => topic.id === id) || null
}