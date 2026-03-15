// src/components/users/ChangeRoleModal.tsx
import React, { useState, useEffect } from 'react'
import { X, Shield } from 'lucide-react'
import type { UserListItem } from '../../types/api'

interface ChangeRoleModalProps {
  user: UserListItem
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, role: 'user' | 'manager' | 'admin') => Promise<void>
}

const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const [selectedRole, setSelectedRole] = useState<'user' | 'manager' | 'admin'>(user.role)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(user.role)
      setError(null)
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(user.id, selectedRole)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du changement de rôle')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const roles = [
    {
      value: 'user' as const,
      label: 'Utilisateur',
      description: 'Accès limité aux topics autorisés',
      color: 'gray'
    },
    {
      value: 'manager' as const,
      label: 'Gestionnaire',
      description: 'Peut créer des topics et voir tous les topics',
      color: 'blue'
    },
    {
      value: 'admin' as const,
      label: 'Administrateur',
      description: 'Accès complet et gestion des utilisateurs',
      color: 'red'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Changer le rôle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* User info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">Utilisateur :</p>
            <p className="font-medium text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          {/* Role selection */}
          <div className="space-y-3">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`
                  flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${selectedRole === role.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{role.label}</p>
                    {role.value === user.role && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                        Actuel
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-primary-700 rounded-md transition-colors disabled:opacity-50"
              disabled={isSubmitting || selectedRole === user.role}
            >
              {isSubmitting ? 'Modification...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangeRoleModal