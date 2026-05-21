import React, { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, CheckCircle2, AlertCircle, Clock,
  RotateCcw, MessageSquare, UserCheck, Zap, Info, Eye
} from 'lucide-react'
import Modal from '../ui/Modal.jsx'

const ACTION_CONFIG = {
  creation:             { icon: Plus,           color: 'bg-blue-100 text-blue-600',   label: 'Création' },
  affectation:          { icon: UserCheck,      color: 'bg-indigo-100 text-indigo-600', label: 'Affectation' },
  prise_en_charge:      { icon: Zap,            color: 'bg-orange-100 text-orange-600', label: 'Prise en charge' },
  soumission_validation:{ icon: Clock,          color: 'bg-violet-100 text-violet-600', label: 'Soumis à validation' },
  validation:           { icon: CheckCircle2,   color: 'bg-green-100 text-green-600', label: 'Validé' },
  retour_pilote:        { icon: RotateCcw,      color: 'bg-red-100 text-red-600',     label: 'Retourné au pilote' },
  resolution:           { icon: CheckCircle2,   color: 'bg-green-100 text-green-600', label: 'Résolu' },
  commentaire:          { icon: MessageSquare,  color: 'bg-slate-100 text-slate-600', label: 'Commentaire' },
  action_ajoutee:       { icon: Plus,           color: 'bg-cyan-100 text-cyan-600',   label: 'Action ajoutée' },
  analyse:              { icon: Info,           color: 'bg-indigo-100 text-indigo-600', label: 'Analyse' },
}

export default function Timeline({ historique = [] }) {
  const [selectedDetails, setSelectedDetails] = useState(null)
  if (!historique.length) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Aucun historique disponible
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {historique.map((item, idx) => {
        const cfg = ACTION_CONFIG[item.action_type] || ACTION_CONFIG['commentaire']
        const Icon = cfg.icon
        const isLast = idx === historique.length - 1

        return (
          <div key={item.id} className="flex gap-3">
            {/* Ligne verticale + icône */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-200 my-1" />}
            </div>

            {/* Contenu */}
            <div className={`pb-4 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">{item.acteur_nom}</span>
                <span className="text-xs text-slate-400 flex-shrink-0" title={item.date_action}>
                  {formatDistanceToNow(new Date(item.date_action), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 mt-0.5">{cfg.label}</p>
                {item.metadata && (
                  <button 
                    onClick={() => {
                      let meta = item.metadata
                      if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta) } catch(e) { meta = null }
                      }
                      setSelectedDetails(meta)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[10px] font-bold"
                  >
                    <Eye className="w-3 h-3" />
                    Plus
                  </button>
                )}
              </div>
              {item.commentaire && (
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
                  {item.commentaire}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {/* Modale de détails de l'analyse */}
      <Modal 
        isOpen={!!selectedDetails} 
        onClose={() => setSelectedDetails(null)} 
        title="Détails de l'analyse"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Catégorie</p>
              <p className="text-sm text-slate-700">{selectedDetails?.categorie || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cause</p>
              <p className="text-sm text-slate-700">{selectedDetails?.cause || 'N/A'}</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[100px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Commentaire d'analyse / Observations</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {selectedDetails?.analyse_commentaire || "Aucun commentaire saisi."}
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setSelectedDetails(null)} className="btn-secondary">Fermer</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
