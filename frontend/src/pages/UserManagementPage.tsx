// src/pages/UserManagementPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowLeft,
  UserPlus,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../stores/authStore'
import { useUsers } from '../stores/userStore'
import EditUserModal from '../components/users/EditUserModal'
import ChangeRoleModal from '../components/users/ChangeRoleModal'
import type { UserListItem } from '../types/api'
import UserCard from '../components/users/UserCard'

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser, canManageUsers, canChangeUserRole } = useAuth()
  const {
    users,
    stats,
    isLoading,
    error,
    filters,
    fetchUsers,
    fetchStats,
    updateUser,
    updateUserRole,
    deactivateUser,
    setFilters,
    clearFilters
  } = useUsers()

  // États locaux
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    // Vérifier les permissions
    if (!canManageUsers()) {
      navigate('/workspace')
      return
    }

    // Charger les données
    fetchUsers()
    fetchStats()
  }, [canManageUsers, navigate, fetchUsers, fetchStats])

  // ========================
  // HANDLERS
  // ========================

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setFilters({ search: query.trim() })
    } else {
      const { search, ...otherFilters } = filters
      setFilters(otherFilters)
    }
  }

  const handleFilterRole = (role?: 'user' | 'manager' | 'admin') => {
    if (role) {
      setFilters({ role })
    } else {
      const { role: _, ...otherFilters } = filters
      setFilters(otherFilters)
    }
  }

  const handleFilterStatus = (is_active?: boolean) => {
    if (is_active !== undefined) {
      setFilters({ is_active })
    } else {
      const { is_active: _, ...otherFilters } = filters
      setFilters(otherFilters)
    }
  }

  const handleRefresh = () => {
    fetchUsers()
    fetchStats()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    clearFilters()
  }

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleChangeRole = (user: UserListItem) => {
    if (!canChangeUserRole()) {
      alert('Vous n\'avez pas les permissions pour changer les rôles')
      return
    }
    setSelectedUser(user)
    setIsRoleModalOpen(true)
  }

  const handleDeactivateUser = async (user: UserListItem) => {
    if (user.id === currentUser?.id) {
      alert('Vous ne pouvez pas désactiver votre propre compte')
      return
    }

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir désactiver l'utilisateur "${user.full_name}" ?`
    )

    if (confirmed) {
      try {
        await deactivateUser(user.id)
        alert('Utilisateur désactivé avec succès')
      } catch (error) {
        console.error('Erreur désactivation:', error)
      }
    }
  }

  const handleSaveUser = async (userId: string, data: any) => {
    await updateUser(userId, data)
    fetchUsers() // Refresh
  }

  const handleSaveRole = async (userId: string, role: any) => {
    await updateUserRole(userId, role)
    fetchUsers() // Refresh
  }

  // ========================
  // COMPUTED VALUES
  // ========================

  const hasActiveFilters = searchQuery || filters.role || filters.is_active !== undefined

  // ========================
  // RENDER HELPERS
  // ========================

  const renderStats = () => {
    if (!stats) return null

    const statCards = [
      {
        label: 'Total',
        value: stats.total_users,
        icon: Users,
        color: 'bg-blue-100 text-blue-600'
      },
      {
        label: 'Administrateurs',
        value: stats.admins_count,
        icon: Users,
        color: 'bg-red-100 text-red-600'
      },
      {
        label: 'Gestionnaires',
        value: stats.managers_count,
        icon: Users,
        color: 'bg-purple-100 text-purple-600'
      },
      {
        label: 'Utilisateurs',
        value: stats.users_count,
        icon: Users,
        color: 'bg-gray-100 text-gray-600'
      },
      {
        label: 'Actifs',
        value: stats.active_users,
        icon: TrendingUp,
        color: 'bg-green-100 text-green-600'
      }
    ]

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    )
  }

  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Barre de recherche */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtre par rôle */}
        <select
          value={filters.role || ''}
          onChange={(e) => handleFilterRole(e.target.value as any || undefined)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Tous les rôles</option>
          <option value="admin">Administrateurs</option>
          <option value="manager">Gestionnaires</option>
          <option value="user">Utilisateurs</option>
        </select>

        {/* Filtre par statut */}
        <select
          value={filters.is_active === undefined ? '' : filters.is_active ? 'active' : 'inactive'}
          onChange={(e) => {
            if (e.target.value === 'active') handleFilterStatus(true)
            else if (e.target.value === 'inactive') handleFilterStatus(false)
            else handleFilterStatus(undefined)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>

        {/* Boutons actions */}
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderUserGrid = () => {
    if (isLoading && users.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        </div>
      )
    }

    if (users.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun utilisateur trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            {hasActiveFilters
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Aucun utilisateur disponible'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onEdit={handleEditUser}
            onChangeRole={handleChangeRole}
            onDeactivate={handleDeactivateUser}
            canManage={currentUser?.id !== user.id} // Ne peut pas se gérer soi-même
          />
        ))}
      </div>
    )
  }

  // ========================
  // RENDER PRINCIPAL
  // ========================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au workspace
          </button>

          {/* Titre */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Utilisateurs
                </h1>
                <p className="text-gray-600">
                  Gérez les rôles et permissions des utilisateurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 overflow-y-auto">
        {/* Erreur globale */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Statistiques */}
        {renderStats()}

        {/* Filtres */}
        {renderFilters()}

        {/* Grille utilisateurs */}
        {renderUserGrid()}
      </div>

      {/* Modals */}
      {selectedUser && (
        <>
          <EditUserModal
            user={selectedUser}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedUser(null)
            }}
            onSave={handleSaveUser}
          />

          <ChangeRoleModal
            user={selectedUser}
            isOpen={isRoleModalOpen}
            onClose={() => {
              setIsRoleModalOpen(false)
              setSelectedUser(null)
            }}
            onSave={handleSaveRole}
          />
        </>
      )}
    </div>
  )
}

export default UserManagementPage