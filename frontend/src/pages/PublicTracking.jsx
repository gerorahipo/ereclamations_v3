import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, CheckCircle, AlertCircle, Calendar, ArrowRight, Building2, FileText, ChevronRight, Share2, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { publicApi } from '../api'
import { generateReclamationPDF } from '../utils/pdfGenerator'
import clsx from 'clsx'

export default function PublicTracking() {
  const navigate = useNavigate()
  const [numero, setNumero] = useState('')
  const [results, setResults] = useState([]) // Liste des résultats
  const [ticket, setTicket] = useState(null) // Ticket sélectionné
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!numero.trim()) return
    
    setLoading(true)
    setError(null)
    setTicket(null)
    setResults([])
    
    try {
      const res = await publicApi.track(numero.trim())
      const data = res.data // C'est un tableau maintenant
      
      if (data.length === 1) {
        setTicket(data[0])
        setResults([data[0]])
      } else {
        setResults(data)
      }
    } catch (err) {
      const msg = err.message || "Numéro de ticket introuvable ou erreur serveur."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { key: 'nouveau',   label: 'Réception',     desc: 'Votre réclamation a été bien reçue.' },
    { key: 'en_cours',  label: 'Traitement',    desc: 'Un pilote analyse votre dossier.' },
    { key: 'a_valider', label: 'Finalisation',  desc: 'La solution est en cours de validation.' },
    { key: 'resolu',    label: 'Terminé',       desc: 'Une réponse vous a été apportée.' }
  ]

  const getCurrentStepIndex = (currentTicket) => {
    if (!currentTicket) return -1
    if (currentTicket.statut === 'rejete') return 3
    return steps.findIndex(s => s.key === currentTicket.statut)
  }

  const handleShare = async () => {
    if (!ticket) return
    const text = `Suivez ma réclamation eRéclamations (N° ${ticket.numero_ticket}) : ${window.location.origin}/tracking?n=${ticket.numero_ticket}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'eRéclamations - Suivi de dossier',
          text: text,
          url: `${window.location.origin}/tracking?n=${ticket.numero_ticket}`
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text)
      swal.success("Lien copié", "Le lien de suivi a été copié dans votre presse-papier.")
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cnps-800 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-black text-lg lg:text-xl shadow-lg shadow-cnps-100">C</div>
            <div>
              <h1 className="text-xs lg:text-sm font-black text-slate-800 uppercase tracking-tighter">eRéclamations</h1>
              <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portail Client</p>
            </div>
          </div>
          <a href="/login" className="text-[10px] lg:text-xs font-black text-cnps-800 uppercase tracking-widest hover:underline flex items-center gap-1 lg:gap-2">
            <span className="hidden sm:inline">Espace Agent</span>
            <span className="sm:hidden">Agent</span>
            <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 lg:py-12 px-4 lg:px-6">
        <div className="w-full max-w-3xl space-y-8 lg:space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 lg:space-y-4">
            <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Suivez votre dossier <span className="text-cnps-800">en temps réel</span></h2>
            <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto">Saisissez votre numéro de ticket pour connaître l'avancement de votre réclamation sans vous déplacer.</p>
          </div>

          {/* Search Form */}
          <div className="space-y-4 lg:space-y-6">
            <div className="bg-white p-1.5 lg:p-2 rounded-[1.5rem] lg:rounded-[2rem] shadow-2xl shadow-cnps-100/50 border border-slate-100">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-6 lg:h-6 text-slate-300" />
                  <input 
                    type="text" 
                    value={numero}
                    onChange={e => setNumero(e.target.value.toUpperCase())}
                    placeholder="EX: REC-2024-0001"
                    className="w-full pl-12 lg:pl-16 pr-4 lg:pr-8 py-4 lg:py-6 rounded-[1.2rem] lg:rounded-[1.5rem] bg-transparent border-none focus:ring-0 text-lg lg:text-xl font-black text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-cnps-800 text-white px-6 lg:px-10 py-4 lg:py-5 rounded-[1.2rem] lg:rounded-[1.5rem] font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-cnps-900 transition-all shadow-xl shadow-cnps-200 disabled:opacity-50"
                >
                  {loading ? "..." : "Rechercher"}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-8 lg:w-12 bg-slate-200" />
              <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ou</p>
              <div className="h-[1px] w-8 lg:w-12 bg-slate-200" />
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => navigate('/declarer')}
                className="group flex items-center gap-3 lg:gap-4 px-5 lg:px-8 py-3.5 lg:py-5 bg-white border border-slate-100 rounded-2xl lg:rounded-3xl shadow-lg hover:shadow-2xl hover:border-cnps-100 transition-all"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cnps-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 group-hover:bg-cnps-800 group-hover:text-white transition-all">
                  <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] lg:text-xs font-black text-slate-900 uppercase tracking-tight">Déclarer une réclamation</p>
                  <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enregistrer un nouveau dossier</p>
                </div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="animate-in fade-in slide-in-from-top duration-500 flex items-center gap-4 p-6 bg-red-50 border border-red-100 rounded-2xl text-red-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          {/* Multiple Results List */}
          {results.length > 1 && !ticket && (
            <div className="animate-in fade-in slide-in-from-bottom duration-700 space-y-4 lg:space-y-6">
              <div className="text-center space-y-1 lg:space-y-2">
                <p className="text-[10px] font-black text-cnps-800 uppercase tracking-[0.2em]">Plusieurs résultats trouvés</p>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">Veuillez sélectionner le dossier que vous souhaitez suivre :</p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:gap-4">
                {results.map((r) => (
                  <button 
                    key={r.id}
                    onClick={() => setTicket(r)}
                    className="flex items-center justify-between p-4 lg:p-6 bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-cnps-100 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cnps-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 group-hover:bg-cnps-800 group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm lg:text-base font-black text-slate-800">{r.numero_ticket}</h4>
                        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">{r.motif}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dernière mise à jour</p>
                        <p className="text-xs font-bold text-slate-700">
                          {r.date_resolution 
                            ? format(new Date(r.date_resolution), 'dd/MM/yyyy', { locale: fr })
                            : format(new Date(r.date_creation), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-slate-300 group-hover:text-cnps-800 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result Section (Detail) */}
          {ticket && (
            <div className="animate-in fade-in zoom-in duration-700 space-y-6 lg:space-y-8 pb-10 lg:pb-20">
              <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-cnps-800 p-6 lg:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 lg:gap-6">
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Dossier sélectionné</p>
                    <h3 className="text-2xl lg:text-3xl font-black">{ticket.numero_ticket}</h3>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl border border-white/20 w-full sm:w-auto">
                    <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-center sm:text-left">Statut actuel</p>
                    <p className="text-lg lg:text-xl font-black flex items-center justify-center sm:justify-start gap-2">
                      <Clock className="w-4 h-4 lg:w-5 lg:h-5" /> {ticket.statut_libelle}
                    </p>
                  </div>
                </div>

                <div className="p-6 lg:p-12 space-y-8 lg:space-y-12">
                  {/* Progress Stepper */}
                  <div className="relative pt-4 sm:pt-0">
                    <div className="absolute top-9 sm:top-5 left-0 w-full h-1 bg-slate-100 rounded-full" />
                    <div 
                      className="absolute top-9 sm:top-5 left-0 h-1 bg-cnps-800 rounded-full transition-all duration-1000" 
                      style={{ width: `${ticket.progression}%` }}
                    />
                    
                    <div className="relative flex justify-between">
                      {steps.map((step, i) => {
                        const isActive = i <= getCurrentStepIndex(ticket)
                        const isCurrent = i === getCurrentStepIndex(ticket)
                        return (
                          <div key={step.key} className="flex flex-col items-center text-center max-w-[70px] sm:max-w-[120px]">
                            <div className={clsx(
                              "w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg text-xs sm:text-base",
                              isActive ? "bg-cnps-800 text-white" : "bg-white text-slate-300 border border-slate-100"
                            )}>
                              {isActive && !isCurrent ? <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" /> : (i + 1)}
                            </div>
                            <h4 className={clsx(
                              "mt-3 sm:mt-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-tight",
                              isActive ? "text-slate-900" : "text-slate-300"
                            )}>{step.label}</h4>
                            <p className="mt-2 text-[9px] font-medium text-slate-400 leading-tight hidden md:block">{step.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 pt-8 lg:pt-12 border-t border-slate-50">
                    <div className="flex gap-3 lg:gap-4 p-4 lg:p-6 bg-slate-50 rounded-2xl lg:rounded-3xl">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 shadow-sm shrink-0">
                        <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Objet de la demande</p>
                        <p className="text-xs lg:text-sm font-bold text-slate-800">{ticket.motif}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 lg:gap-4 p-4 lg:p-6 bg-slate-50 rounded-2xl lg:rounded-3xl">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 shadow-sm shrink-0">
                        <Building2 className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Agence de traitement</p>
                        <p className="text-xs lg:text-sm font-bold text-slate-800">{ticket.agence}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 lg:gap-4 p-4 lg:p-6 bg-slate-50 rounded-2xl lg:rounded-3xl">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 shadow-sm shrink-0">
                        <Calendar className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Déposé le</p>
                        <p className="text-xs lg:text-sm font-bold text-slate-800">
                          {format(new Date(ticket.date_creation), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 lg:gap-4 p-4 lg:p-6 bg-slate-50 rounded-2xl lg:rounded-3xl">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center text-cnps-800 shadow-sm shrink-0">
                        <Clock className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Dernière mise à jour</p>
                        <p className="text-xs lg:text-sm font-bold text-slate-800">
                          {ticket.date_resolution 
                            ? format(new Date(ticket.date_resolution), 'dd/MM/yyyy HH:mm', { locale: fr })
                            : "En cours d'analyse..."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {ticket.statut === 'resolu' && (
                    <div className="bg-green-50 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-green-100 flex items-center gap-3 lg:gap-4">
                      <div className="p-2 lg:p-3 bg-green-500 text-white rounded-xl lg:rounded-2xl shadow-lg shadow-green-100 shrink-0">
                        <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <h4 className="text-[10px] lg:text-sm font-black text-green-800 uppercase tracking-tight">Dossier Traité</h4>
                        <p className="text-[9px] lg:text-xs text-green-700 font-medium">Une solution a été apportée à votre réclamation. Consultez vos emails ou contactez votre agence.</p>
                      </div>
                    </div>
                  )}

                  {ticket.statut === 'rejete' && (
                    <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200 flex items-center gap-3 lg:gap-4">
                      <div className="p-2 lg:p-3 bg-slate-400 text-white rounded-xl lg:rounded-2xl shadow-lg shrink-0">
                        <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <h4 className="text-[10px] lg:text-sm font-black text-slate-800 uppercase tracking-tight">Dossier Clôturé</h4>
                        <p className="text-[9px] lg:text-xs text-slate-600 font-medium">Votre demande a été traitée et clôturée. Pour plus de précisions, contactez l'agence {ticket.agence}.</p>
                      </div>
                    </div>
                  )}

                  {/* PDF Downloads & Share */}
                  <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-4">
                    <button 
                      onClick={() => generateReclamationPDF(ticket, 'accuse')}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 bg-white border border-slate-200 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-cnps-800" />
                      Accusé
                    </button>
                    
                    {(ticket.statut === 'resolu' || ticket.statut === 'rejete') && (
                      <button 
                        onClick={() => generateReclamationPDF(ticket, 'reponse')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 bg-cnps-800 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-white hover:bg-cnps-900 transition-all shadow-lg shadow-cnps-100"
                      >
                        <FileText className="w-4 h-4" />
                        Lettre de réponse
                      </button>
                    )}

                    <button 
                      onClick={handleShare}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center flex flex-col items-center gap-4">
                {results.length > 1 && (
                  <button 
                    onClick={() => setTicket(null)}
                    className="text-xs font-black text-cnps-800 uppercase tracking-widest hover:underline"
                  >
                    Retour à la liste des résultats ({results.length})
                  </button>
                )}
                <button 
                  onClick={() => { setTicket(null); setResults([]); setNumero(''); }}
                  className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-cnps-800 transition-colors"
                >
                  Effectuer une nouvelle recherche
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 lg:py-8 border-t border-slate-100 text-center mt-10 lg:mt-20">
        <p className="text-[8px] lg:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-4">
          © 2024 Institution de Prévoyance Sociale CNPS — Côte d'Ivoire
        </p>
      </footer>
    </div>
  )
}
