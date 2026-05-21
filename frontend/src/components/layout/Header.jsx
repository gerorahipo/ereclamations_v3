import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Building2, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { parametrageApi } from '../../api/index.js'

export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const { user, isSuper } = useAuth()
  const [stats, setStats] = useState(null)
  const [agences, setAgences] = useState([])
  const [switchAgence, setSwitchAgence] = useState('')

  useEffect(() => {
    parametrageApi.stats().then(d => setStats(d?.data)).catch(() => {})
    if (isSuper()) {
      parametrageApi.agences().then(d => setAgences(d?.data || [])).catch(() => {})
    }
  }, [])

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 lg:px-6 gap-2 lg:gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Bouton Menu Mobile */}
      <button 
        onClick={onToggleSidebar}
        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Logo Mobile */}
      <div className="lg:hidden flex items-center gap-2">
        <img src="/logo-cnps.png" alt="CNPS" className="h-8 w-auto" />
      </div>

      {/* Titre page / breadcrumb */}
      <div className="flex-1 hidden sm:block">
        <h1 className="text-sm font-medium text-slate-500 truncate">
          <span className="text-slate-900 font-semibold">CNPS CI</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="truncate">Gestion des Réclamations</span>
        </h1>
      </div>

      {/* Stats rapides */}
      {stats?.counters && (
        <div className="hidden md:flex items-center gap-4 text-xs">
          <span className="text-slate-500">Tickets ouverts :</span>
          <span className="font-semibold text-blue-700">{stats.counters.nouveau || 0} nouveau</span>
          <span className="font-semibold text-orange-700">{stats.counters.en_cours || 0} en cours</span>
          <span className="font-semibold text-violet-700">{stats.counters.a_valider || 0} à clôturer</span>
          {parseInt(stats.counters.hors_sla || 0) > 0 && (
            <span className="font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              🔴 {stats.counters.hors_sla} Hors délai
            </span>
          )}
        </div>
      )}

      {/* Switch Agence (superviseur central uniquement) */}
      {isSuper() && agences.length > 0 && (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={switchAgence}
            onChange={(e) => setSwitchAgence(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700
                       focus:outline-none focus:ring-1 focus:ring-cnps-800"
          >
            <option value="">Toutes les agences</option>
            {agences.map(a => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notifications (dynamique avec compteur) */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors group">
        <Bell className="w-5 h-5 text-slate-500 group-hover:text-cnps-800 transition-colors" />
        {(() => {
          const count = user?.role === 'coordonnateur' 
            ? parseInt(stats?.counters?.a_valider || 0)
            : user?.role === 'pilote' 
              ? (parseInt(stats?.counters?.nouveau || 0) + parseInt(stats?.counters?.en_cours || 0))
              : 0;
          
          if (count === 0) return null;

          return (
            <>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                {count}
              </span>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] animate-ping items-center justify-center rounded-full bg-red-500 opacity-75 ring-2 ring-white" />
            </>
          );
        })()}
      </button>

      {/* Rafraichir */}
      <button
        onClick={() => window.location.reload()}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"
        title="Rafraîchir"
      >
        <RefreshCw className="w-4 h-4 text-slate-500" />
      </button>
    </header>
  )
}
