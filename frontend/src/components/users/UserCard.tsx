// src/components/users/UserCard.tsx
import React from 'react'
import { User, Mail, Calendar, Shield, CheckCircle, XCircle } from 'lucide-react'
import type { UserListItem } from '../../types/api'

interface UserCardProps {
  user: UserListItem
  onEdit: (user: UserListItem) => void
  onChangeRole: (user: UserListItem) => void
  onDeactivate: (user: UserListItem) => void
  canManage: boolean
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onChangeRole,
  onDeactivate,
  canManage
}) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'user':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur'
      case 'manager':
        return 'Gestionnaire'
      case 'user':
        return 'Utilisateur'
      default:
        return role
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header avec avatar et status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Nom et status */}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {user.full_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {user.is_active ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Actif
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  Inactif
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge rôle */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>
      </div>

      {/* Informations */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span className="truncate">{user.email}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Modifier
          </button>
          
          <button
            onClick={() => onChangeRole(user)}
            className="flex-1 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
            disabled={!canManage}
          >
            Changer rôle
          </button>
          
          {user.is_active && (
            <button
              onClick={() => onDeactivate(user)}
              className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              disabled={!canManage}
            >
              Désactiver
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default UserCard