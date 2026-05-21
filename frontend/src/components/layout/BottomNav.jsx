import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, BookOpen, Settings
} from 'lucide-react'
import clsx from 'clsx'

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-40 flex justify-around items-center h-16 safe-area-bottom">
      <NavLink to="/" end className={({ isActive }) =>
        clsx('flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
          isActive ? 'text-cnps-800' : 'text-slate-400')
      }>
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[10px] font-medium">Accueil</span>
      </NavLink>

      <NavLink to="/reclamations/nouvelle" className={({ isActive }) =>
        clsx('flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
          isActive ? 'text-cnps-800' : 'text-slate-400')
      }>
        <PlusCircle className="w-6 h-6" />
        <span className="text-[10px] font-medium">Nouveau</span>
      </NavLink>

      <NavLink to="/knowledge-base" className={({ isActive }) =>
        clsx('flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
          isActive ? 'text-cnps-800' : 'text-slate-400')
      }>
        <BookOpen className="w-6 h-6" />
        <span className="text-[10px] font-medium">Base</span>
      </NavLink>

      <NavLink to="/administration" className={({ isActive }) =>
        clsx('flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
          isActive ? 'text-cnps-800' : 'text-slate-400')
      }>
        <Settings className="w-6 h-6" />
        <span className="text-[10px] font-medium">Profil</span>
      </NavLink>
    </nav>
  )
}
