import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, Settings,
  LogOut, ShieldCheck, Building2, BookOpen, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import clsx from 'clsx'
import AgencySwitcher from './AgencySwitcher.jsx'

const ROLE_LABELS = {
  agent:         'Agent de guichet',
  pilote:        'Pilote',
  coordonnateur: 'Manager de service/section accueil réclamations',
  superviseur:   'Superviseur',
  administrateur: 'Administrateur',
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isSuper, isCoord, isAdmin, currentAgence } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const currentStatut = searchParams.get('statut') || ''
  const currentQueue = searchParams.get('queue') || ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={clsx(
      "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-cnps-900 flex flex-col h-full transform transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo CNPS */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-cnps-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-12 bg-white rounded flex items-center justify-center flex-shrink-0 p-1">
            <img alt="Logo CNPS" className="w-full h-full object-contain" src="/logo-cnps.png" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">eRéclamations</div>
            <div className="text-cnps-300 text-xs">CNPS Côte d'Ivoire</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-cnps-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink to="/" end className={({ isActive }) =>
          clsx('nav-link', isActive && 'active')
        }>
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span>Tableau de bord</span>
        </NavLink>

        <NavLink to="/reclamations/nouvelle" className={({ isActive }) =>
          clsx('nav-link', isActive && 'active')
        }>
          <PlusCircle className="w-4 h-4 flex-shrink-0" />
          <span>Nouvelle réclamation</span>
        </NavLink>

        <NavLink to="/knowledge-base" className={({ isActive }) =>
          clsx('nav-link', isActive && 'active')
        }>
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span>Base de connaissances</span>
        </NavLink>

        <NavLink to="/administration" className={({ isActive }) =>
          clsx('nav-link', isActive && 'active')
        }>
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>Administration & Profil</span>
        </NavLink>

        {/* Statuts rapides */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-semibold text-cnps-500 uppercase tracking-wider mb-2">
            Corbeilles de traitement
          </p>
          {[
            { label: 'Vue globale', to: '/', active: currentStatut === '' && currentQueue === '', dot: 'bg-white/20' },
            { label: 'Non affectées',     to: '/?statut=nouveau', active: currentStatut === 'nouveau', dot: 'bg-blue-400' },
            { label: 'En cours',    to: '/?statut=en_cours', active: currentStatut === 'en_cours', dot: 'bg-orange-400' },
            { label: 'À clôturer',  to: '/?statut=a_valider', active: currentStatut === 'a_valider', dot: 'bg-violet-400' },
            { label: 'Résolu',      to: '/?statut=resolu', active: currentStatut === 'resolu', dot: 'bg-green-400' },
            { label: 'Hors délai',  to: '/?statut=hors_sla', active: currentStatut === 'hors_sla', dot: 'bg-red-400' },
            ...(user?.role !== 'agent' ? [{ label: 'Escaladées', to: '/?queue=escaladees', active: currentQueue === 'escaladees', dot: 'bg-fuchsia-400' }] : []),
            ...((currentAgence?.agence_nom?.toLowerCase()?.includes('digitale') || user?.role === 'administrateur') ? [{ label: 'Non qualifiées', to: '/?queue=non_qualifiees', active: currentQueue === 'non_qualifiees', dot: 'bg-indigo-400' }] : [])
          ].map(({ label, to, active, dot }) => (
            <NavLink
              key={to}
              to={to}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all duration-150",
                active ? "text-white bg-cnps-800/60" : "text-slate-400 hover:text-white hover:bg-cnps-800/40"
              )}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Profil utilisateur */}
      <div className="border-t border-cnps-800/50 p-4">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-8 h-8 bg-cnps-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {(user?.prenoms?.[0] || '') + (user?.nom?.[0] || '')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.prenoms} {user?.nom}
            </p>
            <p className="text-cnps-400 text-[10px] truncate uppercase font-bold tracking-tighter leading-tight">
              {ROLE_LABELS[user?.role] || user?.role}
            </p>
          </div>
        </div>

        <AgencySwitcher />

        <div className="flex items-center gap-1 mt-3 px-1">
          <Building2 className="w-3 h-3 text-cnps-500 flex-shrink-0" />
          <span className="text-cnps-500 text-[10px] font-bold truncate uppercase">{user?.agence_nom}</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-400
                     hover:text-white hover:bg-red-700/30 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
