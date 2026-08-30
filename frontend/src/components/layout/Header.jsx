import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, RefreshCw, Menu, X, CheckCheck, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext.jsx'
import { parametrageApi, notificationsApi } from '../../api/index.js'
import clsx from 'clsx'

const NOTIF_TYPE_DOT = {
  creation:        'bg-cnps-500',
  soumission:      'bg-accent-500',
  retour:          'bg-amber-500',
  retour_escalade: 'bg-violet-500',
  cloture:         'bg-emerald-500',
}

export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate()
  const { user, isCoord } = useAuth()
  const [stats, setStats] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    parametrageApi.stats().then(d => setStats(d?.data)).catch(() => {})
  }, [])

  const refreshUnreadCount = () => {
    notificationsApi.unreadCount().then(d => setUnread(d?.unread || 0)).catch(() => {})
  }

  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 45000) // rafraîchi toutes les 45s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleNotifPanel = () => {
    const willOpen = !notifOpen
    setNotifOpen(willOpen)
    if (willOpen) {
      setLoadingNotifs(true)
      notificationsApi.list(20)
        .then(d => { setNotifs(d?.data || []); setUnread(d?.unread || 0) })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false))
    }
  }

  const handleNotifClick = async (n) => {
    setNotifOpen(false)
    if (!n.lu) {
      setNotifs(list => list.map(x => x.id === n.id ? { ...x, lu: true } : x))
      setUnread(c => Math.max(0, c - 1))
      notificationsApi.markRead(n.id).catch(() => {})
    }
    if (n.reclamation_id) navigate(`/reclamations/${n.reclamation_id}`)
  }

  const handleMarkAllRead = (e) => {
    e.stopPropagation()
    setNotifs(list => list.map(x => ({ ...x, lu: true })))
    setUnread(0)
    notificationsApi.markAllRead().catch(() => {})
  }

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

      {/* Stats rapides (masquées pour le coordonnateur : déjà sur son tableau de bord) */}
      {!isCoord() && stats?.counters && (
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

      {/* Notifications */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={toggleNotifPanel}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors group"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-500 group-hover:text-cnps-800 transition-colors" />
          {unread > 0 && (
            <>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unread > 99 ? '99+' : unread}
              </span>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] animate-ping items-center justify-center rounded-full bg-red-500 opacity-75 ring-2 ring-white" />
            </>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-cnps-700 hover:text-cnps-900 uppercase tracking-wide"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loadingNotifs ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-cnps-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-slate-300">
                  <Inbox className="w-8 h-8" />
                  <p className="text-xs font-bold text-slate-400">Aucune notification</p>
                </div>
              ) : (
                notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={clsx(
                      "w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 items-start",
                      !n.lu && "bg-cnps-50/40"
                    )}
                  >
                    <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", NOTIF_TYPE_DOT[n.type] || 'bg-slate-300', n.lu && 'opacity-30')} />
                    <div className="min-w-0 flex-1">
                      <p className={clsx("text-xs leading-snug", !n.lu ? "font-bold text-slate-800" : "font-medium text-slate-500")}>
                        {n.titre}
                      </p>
                      {n.message && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-slate-300 font-semibold mt-1">
                        {formatDistanceToNow(new Date(n.date_creation), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.lu && <span className="w-2 h-2 rounded-full bg-cnps-600 shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
