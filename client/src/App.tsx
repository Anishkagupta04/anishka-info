import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SessionsPage from './pages/SessionsPage'
import ModulesPage from './pages/ModulesPage'
import ProfilePage from './pages/ProfilePage'
import SessionDetailPage from './pages/SessionDetailPage'
import ModuleDetailPage from './pages/ModuleDetailPage'
import MentorDashboard from './pages/MentorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CreateSessionPage from './pages/CreateSessionPage'
import AnalyticsPage from './pages/AnalyticsPage'
import NotFoundPage from './pages/NotFoundPage'

// Hooks
import { useAuthStore } from './stores/authStore'

function App() {
  const { user, isAuthenticated } = useAuthStore()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        
        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Default redirect to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Student/General routes */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="modules/:id" element={<ModuleDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Mentor routes */}
          <Route
            path="mentor/*"
            element={
              <ProtectedRoute requiredRole="mentor">
                <Routes>
                  <Route index element={<MentorDashboard />} />
                  <Route path="create-session" element={<CreateSessionPage />} />
                  <Route path="sessions" element={<SessionsPage mentorView />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Routes>
              </ProtectedRoute>
            }
          />
          
          {/* Admin routes */}
          <Route
            path="admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<div>User Management</div>} />
                  <Route path="content" element={<div>Content Management</div>} />
                  <Route path="analytics" element={<AnalyticsPage adminView />} />
                  <Route path="settings" element={<div>System Settings</div>} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Box>
  )
}

export default App