// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import WorkspaceLayout from './components/layout/WorkspaceLayout'
import WorkspacePage from './pages/WorkspacePage'
import UserManagementPage from './pages/UserManagementPage' // ← AJOUTER

import './styles/sonam.css'

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          {/* Routes protégées */}
          <Route path="/workspace" element={
            <ProtectedRoute>
              <WorkspaceLayout />
            </ProtectedRoute>
          }>
            {/* Routes workspace imbriquées */}
            <Route index element={<WorkspacePage />} />
            <Route path="topic/:topicId" element={<WorkspacePage />} />
            <Route path="users" element={<UserManagementPage />} /> {/* ← AJOUTER */}
            {/* <Route path="profile" element={<div>Profile Page (TODO)</div>} /> */}
            {/* <Route path="settings" element={<div>Settings Page (TODO)</div>} /> */}
          </Route>

          {/* Routes de redirection */}
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
          <Route path="/topics/:topicId" element={<Navigate to="/workspace/topic/:topicId" replace />} />

          {/* Route 404 */}
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App