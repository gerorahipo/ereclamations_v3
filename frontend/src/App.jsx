import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FicheTraitement from './pages/FicheTraitement.jsx'
import Administration from './pages/Administration.jsx'
import NouvelleReclamation from './pages/NouvelleReclamation.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import Infographie from './pages/Infographie.jsx'
import PublicTracking from './pages/PublicTracking.jsx'
import PublicDeclaration from './pages/PublicDeclaration.jsx'
import ReloadPrompt from './components/ReloadPrompt.jsx'

// ─── Guard de route ──────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cnps-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <>
      <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="/reclamations/nouvelle" element={
          <PrivateRoute roles={['agent', 'pilote', 'coordonnateur', 'superviseur', 'administrateur']}>
            <NouvelleReclamation />
          </PrivateRoute>
        } />
        <Route path="/reclamations/:id" element={<FicheTraitement />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/administration" element={<Administration />} />
      </Route>

      <Route path="/infographie" element={<Infographie />} />
      <Route path="/suivi" element={<PublicTracking />} />
      <Route path="/tracking" element={<PublicTracking />} />
      <Route path="/declarer" element={<PublicDeclaration />} />
      <Route path="*" element={<Navigate to={user ? "/" : "/tracking"} replace />} />
      </Routes>
      <ReloadPrompt />
    </>
  )
}
