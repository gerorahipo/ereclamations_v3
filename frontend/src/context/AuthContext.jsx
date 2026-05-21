import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('ereclamations_token'))
  const [loading, setLoading] = useState(true)
  
  // Agence active pour les intérims
  const [currentAgenceId, setCurrentAgenceId] = useState(() => localStorage.getItem('ereclamations_active_agence_id'))
  const [authorizedAgencies, setAuthorizedAgencies] = useState([])

  // Vérifie le token au montage
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setUser(payload)
          // Reconstruire la liste des agences autorisées
          const mainAgency = { agence_id: payload.agence_id, agence_nom: payload.agence_nom, agence_code: payload.agence_code, is_main: true }
          const allAgencies = [mainAgency, ...(payload.interims || [])]
          setAuthorizedAgencies(allAgencies)
          
          // Si aucune agence active n'est stockée ou si elle n'est plus autorisée, remettre l'agence principale
          if (!currentAgenceId || !allAgencies.find(a => a.agence_id == currentAgenceId)) {
            setCurrentAgenceId(payload.agence_id)
            localStorage.setItem('ereclamations_active_agence_id', payload.agence_id)
          }
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur de connexion')

    localStorage.setItem('ereclamations_token', data.token)
    setToken(data.token)
    setUser(data.user)
    
    // Initialiser l'agence active
    const mainAgency = { agence_id: data.user.agence_id, agence_nom: data.user.agence_nom, agence_code: data.user.agence_code, is_main: true }
    const allAgencies = [mainAgency, ...(data.user.interims || [])]
    setAuthorizedAgencies(allAgencies)
    setCurrentAgenceId(data.user.agence_id)
    localStorage.setItem('ereclamations_active_agence_id', data.user.agence_id)
    
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ereclamations_token')
    localStorage.removeItem('ereclamations_active_agence_id')
    setToken(null)
    setUser(null)
    setCurrentAgenceId(null)
    setAuthorizedAgencies([])
  }, [])

  const switchAgence = (agenceId) => {
    setCurrentAgenceId(agenceId)
    localStorage.setItem('ereclamations_active_agence_id', agenceId)
  }

  // Helpers rôle
  const hasRole  = (roles) => roles.includes(user?.role)
  const isAgent  = () => user?.role === 'agent'
  const isPilote = () => user?.role === 'pilote'
  const isCoord  = () => user?.role === 'coordonnateur'
  const isSuper  = () => user?.role === 'superviseur'
  const isAdmin  = () => user?.role === 'administrateur'
  const isCentrale = () => user?.agence_type === 'centrale'
  
  const currentAgence = authorizedAgencies.find(a => a.agence_id == currentAgenceId) || {}

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      currentAgenceId, currentAgence, authorizedAgencies, switchAgence,
      login, logout,
      hasRole, isAgent, isPilote, isCoord, isSuper, isAdmin, isCentrale,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
