// src/components/permissions/AddPermissionModal.tsx
import React, { useState, useEffect } from 'react'
import { X, Search, Eye, Edit, Key } from 'lucide-react'
import { usePermissions } from '../../stores/permissionsStore'
import type { PermissionLevel } from '../../types/api'

interface AddPermissionModalProps {
  isOpen: boolean
  topicId: string
  onClose: () => void
  onSuccess: () => void
}

export const AddPermissionModal: React.FC<AddPermissionModalProps> = ({
  isOpen,
  topicId,
  onClose,
  onSuccess
}) => {
  const { availableUsers, fetchAvailableUsers, grantPermission, isLoading, error } = usePermissions()
  
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('read')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers(topicId)
    }
  }, [isOpen, topicId, fetchAvailableUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUserId || !selectedPermission) {
      return
    }

    try {
      await grantPermission(topicId, selectedUserId, selectedPermission)
      onSuccess()
      onClose()
    } catch (error) {
      // Erreur déjà gérée par le store
    }
  }

  const filteredUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Ajouter un utilisateur
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Sélection utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utilisateur
            </label>
            
            {/* Recherche */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Liste déroulante */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un utilisateur...</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
            
            {filteredUsers.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Aucun utilisateur disponible
              </p>
            )}
          </div>

          {/* Sélection permission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Niveau de permission
            </label>
            
            <div className="space-y-3">
              {/* READ */}
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="permission"
                  value="read"
                  checked={selectedPermission === 'read'}
                  onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Lecture</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Consultation des documents uniquement
                  </p>
                </div>
              </label>

              {/* WRITE */}
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="permission"
                  value="write"
                  checked={selectedPermission === 'write'}
                  onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Edit className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Écriture</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Consultation + Upload de documents
                  </p>
                </div>
              </label>

              {/* ADMIN */}
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="permission"
                  value="admin"
                  checked={selectedPermission === 'admin'}
                  onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-gray-900">Admin</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Toutes permissions + Gestion des accès
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selectedUserId || isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Ajout...' : 'Accorder l\'accès'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}