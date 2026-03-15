// src/pages/AuthPage.tsx
import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { useAuthStore } from '../stores/authStore'

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Rediriger si déjà connecté
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSuccess = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            RAG Chatbot
          </h1>
          <p className="text-gray-600">
            Votre assistant IA pour interroger vos documents
          </p>
        </div>

        {mode === 'login' ? (
          <LoginForm 
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm 
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  )
}


