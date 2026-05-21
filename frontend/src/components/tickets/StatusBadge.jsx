import React from 'react'
import clsx from 'clsx'

const BADGE_MAP = {
  nouveau:    'badge-nouveau',
  en_cours:   'badge-en-cours',
  a_valider:  'badge-a-valider',
  resolu:     'badge-resolu',
  rejete:     'badge-rejete',
}

const LABEL_MAP = {
  nouveau:    'Nouveau',
  en_cours:   'En cours',
  a_valider:  'À Clôturer',
  resolu:     'Résolu',
  rejete:     'Rejeté',
}

export default function StatusBadge({ statut, horsSlA = false, isImputed = false }) {
  if (horsSlA && statut !== 'resolu' && statut !== 'rejete') {
    return <span className="badge-hors-sla">⚠ Hors délai</span>
  }

  return (
    <span className={clsx(
      BADGE_MAP[statut] || 'badge bg-slate-100 text-slate-600',
      isImputed && statut === 'nouveau' && 'animate-pulse ring-2 ring-blue-400 ring-offset-1'
    )}>
      {LABEL_MAP[statut] || statut}
    </span>
  )
}
