// src/components/permissions/PermissionsPanel.tsx
import React, { useEffect, useState } from 'react'
import { UserPlus, Search, Filter, RefreshCw, Users, Shield } from 'lucide-react'
import { usePermissions } from '../../stores/permissionsStore'
import { PermissionUserCard } from './PermissionUserCard'
import { AddPermissionModal } from './AddPermissionModal'
import { ChangePermissionModal } from './ChangePermissionModal'
import type { TopicPermission, PermissionLevel } from '../../types/api'

interface PermissionsPanelProps {
  topicId: string
  currentUserPermission: PermissionLevel | 'global_admin'
}

export const PermissionsPanel: React.FC<PermissionsPanelProps> = ({
  topicId,
  currentUserPermission
}) => {

  const {
    permissions,
    fetchTopicPermissions,
    revokePermission,
    updatePermission,
    isLoading,
    error
  } = usePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterPermission, setFilterPermission] = useState<PermissionLevel | 'all'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<TopicPermission | null>(null)

  // Charger les permissions
  useEffect(() => {
    fetchTopicPermissions(topicId)
  }, [topicId, fetchTopicPermissions])

  // Filtrer les permissions
  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = 
      perm.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterPermission === 'all' || perm.permission === filterPermission

    return matchesSearch && matchesFilter
  })

  // Stats
  const stats = {
    total: permissions.length,
    read: permissions.filter(p => p.permission === 'read').length,
    write: permissions.filter(p => p.permission === 'write').length,
    admin: permissions.filter(p => p.permission === 'admin').length
  }

  // Handlers
  const handleModify = (permission: TopicPermission) => {
    setSelectedPermission(permission)
    setIsChangeModalOpen(true)
  }

  const handleRevoke = async (permission: TopicPermission) => {
    const confirm = window.confirm(
      `Êtes-vous sûr de vouloir révoquer l'accès de ${permission.user.full_name} ?`
    )
    
    if (confirm) {
      await revokePermission(topicId, permission.user_id)
    }
  }

  const handleSavePermission = async (userId: string, newPermission: PermissionLevel) => {
    await updatePermission(topicId, userId, newPermission)
  }

  const handleRefresh = () => {
    fetchTopicPermissions(topicId)
  }

  const canManage = currentUserPermission === 'admin' || currentUserPermission === 'global_admin'

  console.log('🔐 PermissionsPanel - topicId:', topicId)
  console.log('🔐 PermissionsPanel - currentUserPermission:', currentUserPermission)
    
  console.log('🔐 PermissionsPanel - canManage:', canManage)

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Lecture</span>
            <Shield className="h-4 w-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.read}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Écriture</span>
            <Shield className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.write}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Admin</span>
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.admin}</p>
        </div>
      </div>

      {/* Filtres et actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtre par permission */}
          <select
            value={filterPermission}
            onChange={(e) => setFilterPermission(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Toutes les permissions</option>
            <option value="read">Lecture uniquement</option>
            <option value="write">Écriture</option>
            <option value="admin">Admin</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            {canManage && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Liste des permissions */}
      {isLoading && permissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des permissions...</p>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune permission trouvée
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterPermission !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Aucun utilisateur n\'a encore accès à ce topic'
            }
          </p>
          {canManage && !searchQuery && filterPermission === 'all' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter un utilisateur
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPermissions.map((permission) => (
            <PermissionUserCard
              key={permission.id}
              permission={permission}
              canManage={canManage}
              onModify={handleModify}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddPermissionModal
        isOpen={isAddModalOpen}
        topicId={topicId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchTopicPermissions(topicId)}
      />

      {selectedPermission && (
        <ChangePermissionModal
          isOpen={isChangeModalOpen}
          permission={selectedPermission}
          onClose={() => {
            setIsChangeModalOpen(false)
            setSelectedPermission(null)
          }}
          onSave={handleSavePermission}
        />
      )}
    </div>
  )
}