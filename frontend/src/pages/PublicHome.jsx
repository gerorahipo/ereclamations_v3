import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2, Search, ArrowRight, ShieldCheck, Lock, Clock, CheckCircle } from 'lucide-react'

export default function PublicHome() {
  const navigate = useNavigate()
  const [ticket, setTicket] = useState('')

  const handleTrack = (e) => {
    e.preventDefault()
    const t = ticket.trim()
    navigate(t ? `/suivi?n=${encodeURIComponent(t)}` : '/suivi')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Barre supérieure */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-cnps.png" alt="Logo CNPS" className="h-10 w-auto" />
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm">eRéclamations</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">Portail assuré · CNPS CI</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
          >
            <Lock className="w-4 h-4 text-cnps-800" />
            <span className="hidden sm:inline">Espace agent CNPS</span>
            <span className="sm:hidden">Agent</span>
          </button>
        </div>
      </header>

      {/* Héro */}
      <section className="relative bg-cnps-900 overflow-hidden">
        <img src="/bg_image.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-cnps-950/95 via-cnps-900/85 to-cnps-800/60" />
        <div className="relative max-w-6xl mx-auto px-5 lg:px-8 py-16 lg:py-24 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/15 mb-6">
            <ShieldCheck className="w-4 h-4 text-accent-400" /> Caisse Nationale de Prévoyance Sociale
          </span>
          <h1 className="text-3xl lg:text-5xl font-black text-white leading-tight max-w-3xl mx-auto">
            Vos réclamations, en toute simplicité
          </h1>
          <p className="text-base lg:text-lg text-blue-100 mt-5 max-w-2xl mx-auto leading-relaxed">
            Déclarez une réclamation ou suivez l'avancement de votre réclamation, où que vous soyez, 24h/24.
          </p>
        </div>
      </section>

      {/* Cartes d'action */}
      <main className="flex-grow">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 -mt-12 lg:-mt-16 pb-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Déclarer */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-7 lg:p-8 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-cnps-50 text-cnps-800 flex items-center justify-center mb-5">
                <FilePlus2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Déclarer une réclamation</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed flex-grow">
                Ouvrez une nouvelle réclamation en quelques minutes. Un numéro de suivi vous sera communiqué.
              </p>
              <button
                onClick={() => navigate('/declarer')}
                className="mt-6 inline-flex items-center justify-center gap-2 bg-cnps-800 hover:bg-cnps-900 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-lg"
              >
                Commencer ma déclaration <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Suivre */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-7 lg:p-8 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 flex items-center justify-center mb-5">
                <Search className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Suivre une réclamation</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed flex-grow">
                Saisissez votre numéro de ticket pour connaître l'avancement de votre réclamation.
              </p>
              <form onSubmit={handleTrack} className="mt-6 flex flex-col sm:flex-row gap-2">
                <input
                  value={ticket}
                  onChange={e => setTicket(e.target.value.toUpperCase())}
                  placeholder="Ex: REC-2026-000123"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-cnps-800 focus:border-cnps-800 transition-all"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold text-sm px-5 py-3.5 rounded-2xl transition-colors shadow-lg"
                >
                  Suivre <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>

          {/* Réassurance : les 3 étapes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
            {[
              { icon: <FilePlus2 className="w-5 h-5" />, t: '1. Déclarez', d: 'Décrivez votre réclamation en ligne.' },
              { icon: <Clock className="w-5 h-5" />, t: '2. Suivez', d: "Consultez l'avancement en temps réel." },
              { icon: <CheckCircle className="w-5 h-5" />, t: '3. Résolu', d: 'Recevez la réponse de nos services.' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-cnps-50 text-cnps-700 flex items-center justify-center shrink-0">{s.icon}</div>
                <div>
                  <div className="text-sm font-black text-slate-800">{s.t}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} CNPS Côte d'Ivoire. Tous droits réservés.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">Confidentialité</a>
            <a href="#" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">Aide</a>
            <button onClick={() => navigate('/login')} className="text-xs font-semibold text-cnps-800 hover:underline">Espace agent</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
