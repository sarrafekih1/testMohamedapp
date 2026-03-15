// src/pages/DashboardPage.tsx - Version mise à jour Phase 2
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTopicsStore } from '../stores/topicsStore'
import { TopicGrid } from '../components/topics/TopicGrid'
import { LogOut, User, Settings, Folder, FileText, MessageSquare } from 'lucide-react'
import type { Topic } from '../types/api'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { topics, fetchTopics } = useTopicsStore()

  // Charger les topics au montage du composant
  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleTopicClick = (topic: Topic) => {
    // Navigation vers la page du topic (Phase 3)
    console.log('Navigation vers topic:', topic.id)
    navigate(`/topics/${topic.id}`)
  }

  // Calculs des statistiques
  const totalTopics = topics.length
  const activeTopics = topics.filter(t => t.is_active).length
  const totalDocuments = 0 // TODO: Calculer depuis les APIs
  const totalConversations = 0 // TODO: Calculer depuis les APIs

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RAG Chatbot</h1>
              <p className="text-sm text-gray-600">Dashboard</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.full_name}</span>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                  {user?.role}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Bienvenue, {user?.full_name} !
              </h2>
              <p className="text-gray-600">
                Votre système RAG est prêt. Vous pouvez créer des topics, 
                uploader des documents et discuter avec vos données.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                      <Folder className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Topics
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{totalTopics}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Documents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{totalDocuments}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Conversations
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{totalConversations}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Settings className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Topics Actifs
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{activeTopics}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Topics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Mes Topics
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Organisez vos documents par thème
                  </p>
                </div>
              </div>
              
              <TopicGrid onTopicClick={handleTopicClick} />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}