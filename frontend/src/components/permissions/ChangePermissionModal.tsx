// src/components/permissions/ChangePermissionModal.tsx
import React, { useState } from 'react'
import { X, Eye, Edit, Key, AlertTriangle } from 'lucide-react'
import { usePermissions } from '../../stores/permissionsStore'
import type { TopicPermission, PermissionLevel } from '../../types/api'

interface ChangePermissionModalProps {
  isOpen: boolean
  permission: TopicPermission
  onClose: () => void
  onSave: (userId: string, newPermission: PermissionLevel) => Promise<void>
}

export const ChangePermissionModal: React.FC<ChangePermissionModalProps> = ({
  isOpen,
  permission,
  onClose,
  onSave
}) => {
  const { isLoading, error } = usePermissions()
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>(permission.permission)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Confirmation si downgrade depuis admin
    if (permission.permission === 'admin' && selectedPermission !== 'admin') {
      const confirm = window.confirm(
        'Êtes-vous sûr de vouloir retirer les droits admin ? L\'utilisateur ne pourra plus gérer les permissions.'
      )
      if (!confirm) return
    }

    try {
      await onSave(permission.user_id, selectedPermission)
      onClose()
    } catch (error) {
      // Erreur déjà gérée par le store
    }
  }

  const hasChanged = selectedPermission !== permission.permission

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Modifier la permission
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
          {/* Info utilisateur */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {permission.user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {permission.user.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {permission.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Warning si downgrade admin */}
          {permission.permission === 'admin' && selectedPermission !== 'admin' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Retirer les droits admin empêchera cet utilisateur de gérer les permissions.
                </p>
              </div>
            </div>
          )}

          {/* Sélection permission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Niveau de permission
            </label>
            
            <div className="space-y-3">
              {/* READ */}
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPermission === 'read' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'
              }`}>
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
                    {permission.permission === 'read' && (
                      <span className="text-xs text-gray-500">(actuel)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Consultation des documents uniquement
                  </p>
                </div>
              </label>

              {/* WRITE */}
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPermission === 'write' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'
              }`}>
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
                    {permission.permission === 'write' && (
                      <span className="text-xs text-gray-500">(actuel)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Consultation + Upload de documents
                  </p>
                </div>
              </label>

              {/* ADMIN */}
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPermission === 'admin' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'
              }`}>
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
                    {permission.permission === 'admin' && (
                      <span className="text-xs text-gray-500">(actuel)</span>
                    )}
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
              disabled={!hasChanged || isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}