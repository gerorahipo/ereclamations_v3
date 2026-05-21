import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Building2, ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

export default function AgencySwitcher() {
  const { currentAgenceId, authorizedAgencies, switchAgence } = useAuth()
  const [isOpen, setIsOpen] = React.useState(false)

  // Ne pas afficher si une seule agence
  if (authorizedAgencies.length <= 1) return null

  const current = authorizedAgencies.find(a => a.agence_id == currentAgenceId)

  return (
    <div className="relative mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-cnps-800/50 rounded-lg border border-cnps-700/50 hover:bg-cnps-800 transition-all text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-cnps-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-cnps-400 font-bold uppercase leading-tight">Agence Active</div>
            <div className="text-white text-xs font-black truncate leading-tight">
              {current?.agence_nom || 'Inconnue'}
            </div>
          </div>
        </div>
        <ChevronDown className={clsx("w-3.5 h-3.5 text-cnps-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute bottom-full left-0 w-full mb-2 bg-cnps-800 border border-cnps-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
            <div className="px-3 py-2 border-b border-cnps-700/50 mb-1">
              <span className="text-[9px] font-black uppercase text-cnps-500 tracking-widest">Choisir un espace</span>
            </div>
            {authorizedAgencies.map((a) => (
              <button
                key={a.agence_id}
                onClick={() => {
                  switchAgence(a.agence_id)
                  setIsOpen(false)
                  window.location.reload() // Recharger pour rafraîchir toutes les données proprement
                }}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-all",
                  a.agence_id == currentAgenceId 
                    ? "text-white bg-cnps-700" 
                    : "text-cnps-300 hover:bg-cnps-700/50 hover:text-white"
                )}
              >
                <div className="flex flex-col items-start">
                  <span>{a.agence_nom}</span>
                  {a.is_main && <span className="text-[8px] opacity-50 uppercase tracking-tighter">(Agence Principale)</span>}
                </div>
                {a.agence_id == currentAgenceId && <Check className="w-3 h-3 text-green-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
