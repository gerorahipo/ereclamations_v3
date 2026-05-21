import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Send, CheckCircle, RotateCcw, CheckSquare,
  Loader2, AlertTriangle, Clock, Building2, User, Calendar,
  Pencil, Trash2, Paperclip, FileText, Download, CheckSquare as CheckSquareIcon, Lightbulb,
  Phone, Mail, Tag, History, ChevronDown, ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { reclamationsApi, actionsApi, parametrageApi, attachmentsApi, knowledgeBaseApi, kbApi, publicApi } from '../api/index.js'
import StatusBadge from '../components/tickets/StatusBadge.jsx'
import Timeline from '../components/tickets/Timeline.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlert } from '../context/AlertContext.jsx'
import { generateReclamationPDF } from '../utils/pdfGenerator'

export default function FicheTraitement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAgent, isPilote, isCoord, isSuper, currentAgence } = useAuth()
  const swal = useAlert()

  const [data, setData]       = useState(null)
  const { data: ticket, actions = [], historique = [] } = data || {}
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [attachments, setAttachments] = useState([])
  const [clientHistory, setClientHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)

  // Modales
  const [showActionModal, setShowActionModal]       = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [showEscaladeModal, setShowEscaladeModal]     = useState(false)
  const [validationMode, setValidationMode]           = useState('valider') // 'valider' | 'retourner'

  // Form action
  const [actionForm, setActionForm] = useState({
    libelle: '', ressource_id: '', observations: ''
  })
  const [agences, setAgences] = useState([])

  // Form validation
  const [commentaire, setCommentaire] = useState('')

  // Form Analyse
  const [analyseForm, setAnalyseForm] = useState({
    categorie_cause_id: '', cause_id: '', analyse_commentaire: ''
  })
  const [categories, setCategories] = useState([])
  const [causes, setCauses]     = useState([])

  // Clôture Action
  const [showClotureModal, setShowClotureModal] = useState(false)
  const [selectedAction, setSelectedAction]     = useState(null)
  const [clotureCommentaire, setClotureCommentaire] = useState('')

  // Coordination
  const [remarquesCoordination, setRemarquesCoordination] = useState('')
  const [editingAction, setEditingAction] = useState(null)
  const [escaladeForm, setEscaladeForm]   = useState({ agence_cible_id: '', commentaire: '' })

  // Qualification states
  const [qualifProcessus, setQualifProcessus] = useState([])
  const [qualifMotifs, setQualifMotifs]       = useState([])
  const [qualifSousMotifs, setQualifSousMotifs] = useState([])
  const [qualifForm, setQualifForm]           = useState({
    processus_id: '',
    motif_id: '',
    sous_motif_id: '',
    commentaire_agent: ''
  })

  // Base de connaissances
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const fetchFiche = async () => {
    setLoading(true)
    try {
      const res = await reclamationsApi.get(id)
      setData(res)
      setRemarquesCoordination(res.data?.remarques_coordination || '')
      
      // Charger les pièces jointes
      const pjRes = await attachmentsApi.list(id)
      setAttachments(pjRes?.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!ticket?.sous_motif_id) return
    setLoadingSuggestions(true)
    try {
      const res = await kbApi.list({ sous_motif_id: ticket.sous_motif_id })
      setSuggestions(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingSuggestions(false) }
  }

  useEffect(() => {
    fetchFiche()
    fetchSuggestions()
    parametrageApi.agences()
      .then(d => setAgences(d?.data || []))
      .catch(() => {})
  }, [id])

  // Charger les catégories quand le ticket est chargé
  useEffect(() => {
    if (ticket?.processus_id) {
      parametrageApi.categoriesCauses({ processus_id: ticket.processus_id })
        .then(d => setCategories(d?.data || []))
        .catch(() => {})
    }
    if (ticket) {
      setAnalyseForm({
        categorie_cause_id: ticket.categorie_cause_id || '',
        cause_id: ticket.cause_id || '',
        analyse_commentaire: ticket.analyse_commentaire || ''
      })
    }
  }, [ticket?.id, ticket?.processus_id])

  // Charger les causes quand la catégorie change
  useEffect(() => {
    if (analyseForm.categorie_cause_id) {
      parametrageApi.causes({ categorie_id: analyseForm.categorie_cause_id })
        .then(d => setCauses(d?.data || []))
        .catch(() => {})
    } else {
      setCauses([])
    }
  }, [analyseForm.categorie_cause_id])

  // Charger l'historique client
  useEffect(() => {
    if (ticket?.partenaire_identifiant) {
      reclamationsApi.history(ticket.partenaire_identifiant)
        .then(res => {
          if (res) {
            setClientHistory(res.filter(h => h.id !== ticket.id))
          }
        })
        .catch(err => console.error("History fetch error:", err))
    }
  }, [ticket?.partenaire_identifiant, ticket?.id])

  const isDigitalAgencyTicket = ticket?.agence_nom?.toLowerCase()?.includes('digitale')
  const isDigitalAgencyUser   = currentAgence?.agence_nom?.toLowerCase()?.includes('digitale') || ['superviseur', 'administrateur'].includes(user?.role)
  const canQualify            = isDigitalAgencyTicket && isDigitalAgencyUser && ['nouveau', 'en_cours'].includes(ticket?.statut) && ticket?.processus_code === 'NQ'

  // Qualification logic
  useEffect(() => {
    if (canQualify) {
      parametrageApi.processus()
        .then(res => setQualifProcessus(res?.data || []))
        .catch(err => console.error("Error loading qualif processus", err))
    }
  }, [canQualify])

  useEffect(() => {
    if (canQualify && ticket?.regime_id && ticket?.type_client_id) {
      publicApi.motifs({
        regime_id: ticket.regime_id,
        type_client_id: ticket.type_client_id
      })
      .then(res => setQualifMotifs(res?.data || []))
      .catch(err => console.error("Error loading qualif motifs", err))
    }
  }, [canQualify, ticket?.regime_id, ticket?.type_client_id])

  useEffect(() => {
    if (canQualify && qualifForm.motif_id) {
      publicApi.sousMotifs({ motif_id: qualifForm.motif_id })
        .then(res => setQualifSousMotifs(res?.data || []))
        .catch(err => console.error("Error loading qualif sous-motifs", err))
    } else {
      setQualifSousMotifs([])
    }
  }, [canQualify, qualifForm.motif_id])

  useEffect(() => {
    if (ticket && canQualify) {
      setQualifForm({
        processus_id: ticket.processus_id || '',
        motif_id: ticket.motif_id || '',
        sous_motif_id: ticket.sous_motif_id || '',
        commentaire_agent: ticket.commentaire_agent || ''
      })
    }
  }, [ticket?.id, canQualify])

  const handleQualify = async (e) => {
    e.preventDefault()
    if (!qualifForm.processus_id || !qualifForm.motif_id || !qualifForm.sous_motif_id) {
      swal.error("Champs requis", "Veuillez renseigner le processus, le motif et le sous-motif.")
      return
    }
    setSaving(true)
    try {
      await reclamationsApi.qualify(id, qualifForm)
      swal.success("Succès", "La réclamation a été qualifiée avec succès.")
      fetchFiche()
    } catch (e) {
      swal.error("Erreur", e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Actions pilote ─────────────────────────────────────────
  const handlePrendreEnCharge = async () => {
    setSaving(true)
    try {
      await reclamationsApi.updateStatut(id, { statut: 'en_cours', commentaire: 'Prise en charge du dossier.' })
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }
  
  const handleEscalader = async (e) => {
    e.preventDefault()
    if (!escaladeForm.agence_cible_id) return
    setSaving(true)
    try {
      await reclamationsApi.escalader(id, escaladeForm)
      swal.success("Succès", "Dossier escaladé avec succès.")
      navigate('/')
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleSoumettre = async () => {
    setSaving(true)
    try {
      const res = await reclamationsApi.soumettre(id)
      if (res && res.message && res.message.includes('retournée')) {
        swal.success("Succès", res.message)
        navigate('/')
      } else {
        swal.success("Succès", "Dossier soumis à la validation.")
        fetchFiche()
      }
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleSaveAnalyse = async () => {
    setSaving(true)
    try {
      await reclamationsApi.updateAnalyse(id, analyseForm)
      swal.success("Succès", "L'analyse a été mise à jour.")
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleAjouterAction = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingAction) {
        await actionsApi.update(editingAction.id, actionForm)
        swal.success("Succès", "L'action a été modifiée.")
      } else {
        await actionsApi.create(id, actionForm)
        swal.success("Succès", "L'action a été ajoutée.")
      }
      setShowActionModal(false)
      setEditingAction(null)
      setActionForm({ libelle: '', ressource_id: '', observations: '' })
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteAction = async (action) => {
    const confirm = await swal.confirm("Confirmation", `Voulez-vous vraiment supprimer l'action "${action.libelle}" ?`)
    if (!confirm) return

    setSaving(true)
    try {
      await actionsApi.delete(action.id)
      swal.success("Succès", "L'action a été supprimée.")
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleSaveRemarques = async () => {
    setSaving(true)
    try {
      await reclamationsApi.updateRemarques(id, { remarques_coordination: remarquesCoordination })
      swal.success("Succès", "Vos remarques ont été enregistrées.")
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const openEditModal = (action) => {
    setEditingAction(action)
    setActionForm({
      libelle: action.libelle,
      ressource_id: action.ressource_id || '',
      observations: action.observations || ''
    })
    setShowActionModal(true)
  }

  const handleCloturerAction = async (e) => {
    e.preventDefault()
    if (!selectedAction) return
    setSaving(true)
    try {
      await actionsApi.update(selectedAction.id, {
        statut: 'termine',
        commentaire_cloture: clotureCommentaire
      })
      setShowClotureModal(false)
      setSelectedAction(null)
      setClotureCommentaire('')
      fetchFiche()
      swal.success("Succès", "L'action a été marquée comme réalisée.")
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleUseSuggestion = async (suggestion) => {
    setAnalyseForm(prev => ({
      ...prev,
      analyse_commentaire: (prev.analyse_commentaire ? prev.analyse_commentaire + "\n\n" : "") + suggestion.analyse_type
    }))

    // Ajouter les actions types si présentes
    const actionsTypes = typeof suggestion.actions_types === 'string' ? JSON.parse(suggestion.actions_types) : suggestion.actions_types
    if (actionsTypes && actionsTypes.length > 0) {
      for (const act of actionsTypes) {
        try {
          await actionsApi.create(id, { libelle: act.libelle, observations: 'Ajouté via Base de Connaissances' })
        } catch (e) { console.error("Erreur ajout action type:", e) }
      }
      fetchFiche()
    }

    setShowSuggestionsModal(false)
    swal.success("Copié !", "L'analyse et les actions types ont été importées.")
  }

  // ─── Clôture manager ────────────────────────────────
  const handleValidation = async (e) => {
    e.preventDefault()
    if (validationMode === 'retourner' && !commentaire.trim()) return
    setSaving(true)
    try {
      if (validationMode === 'valider') {
        await reclamationsApi.valider(id, { commentaire })
      } else {
        await reclamationsApi.retourner(id, { commentaire })
      }
      setShowValidationModal(false)
      setCommentaire('')
      fetchFiche()
    } catch (e) { swal.error("Erreur", e.message) }
    finally { setSaving(false) }
  }

  const handleUploadAttachment = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    setSaving(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files[]', f))
      await attachmentsApi.upload(id, formData)
      
      // Recharger les PJ
      const pjRes = await attachmentsApi.list(id)
      setAttachments(pjRes?.data || [])
      swal.success("Succès", "Pièce(s) jointe(s) ajoutée(s).")
    } catch (e) {
      swal.error("Erreur", e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAttachment = async (pj) => {
    const confirm = await swal.confirm("Confirmation", `Supprimer le fichier "${pj.nom_original}" ?`)
    if (!confirm) return

    setSaving(true)
    try {
      await attachmentsApi.delete(pj.id)
      setAttachments(prev => prev.filter(item => item.id !== pj.id))
      swal.success("Succès", "Fichier supprimé.")
    } catch (e) {
      swal.error("Erreur", e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-cnps-800" />
    </div>
  )

  if (error) return (
    <div className="text-center py-16 text-red-600">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      {error}
    </div>
  )

  if (!ticket) return null

  const canTakeCharge = isPilote() && ticket?.statut === 'nouveau' && !ticket?.pilote_id && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)
  const canAddAction  = (isPilote() || isSuper()) && ['en_cours', 'nouveau'].includes(ticket.statut) && (isSuper() || ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)
  
  const allActionsTerminated = actions.length > 0 && actions.every(a => a.statut === 'termine')
  const isAnalyseDone = !!(ticket.categorie_cause_id && ticket.cause_id && ticket.analyse_commentaire?.trim())
  const canSubmit = isPilote() && ['en_cours', 'nouveau'].includes(ticket.statut) && allActionsTerminated && isAnalyseDone && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)
  
  const canEditAnalyse = isPilote() && ['en_cours', 'nouveau'].includes(ticket.statut) && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)
  const canValidate = (isCoord() || isSuper()) && ticket.statut === 'a_valider' && (isSuper() || ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)

  return (
    <div>
      {/* Breadcrumb + retour */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary !px-2 !py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Réclamations</span>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-semibold text-cnps-800">{ticket.numero_ticket}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge statut={ticket.statut} horsSlA={ticket.hors_sla} />
        </div>
      </div>

      {isPilote() && ticket?.statut === 'en_cours' && ticket?.remarques_coordination && (
        <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 border-l-4 border-l-amber-500 rounded-xl text-amber-900 text-sm shadow-sm flex items-start gap-3 animate-in slide-in-from-top duration-500 border border-amber-200/50">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <p className="font-extrabold text-amber-900 text-sm">⚠️ Cette réclamation a été retournée par le manager de service accueil réclamations pour correction</p>
            <p className="mt-1.5 text-xs text-amber-800 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-amber-200/40">
              <span className="font-extrabold text-amber-950 uppercase tracking-wide">Motif du retour / Correction demandée :</span> <span className="italic">"{ticket.remarques_coordination}"</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Colonne principale ─────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Info partenaire */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900">Informations de la réclamation</h2>
              <span className="text-xs text-slate-400">
                Créé le {format(new Date(ticket.date_creation), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Partenaire">
                <span className="font-medium">
                  {ticket.partenaire_nom_prenoms || ticket.partenaire_raison_sociale ? (
                    <>
                      {ticket.partenaire_nom_prenoms}
                      {ticket.regime_has_employeur !== false && ticket.partenaire_nom_prenoms && ticket.partenaire_raison_sociale && ' / '}
                      {ticket.regime_has_employeur !== false && ticket.partenaire_raison_sociale && ticket.partenaire_raison_sociale}
                    </>
                  ) : (
                    ticket.partenaire_nom || 'Monsieur / Madame'
                  )}
                </span>
              </InfoRow>
              <InfoRow icon={Building2} label="Agence">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900">
                    {ticket.agence_nom} <span className="text-slate-400 text-xs font-normal">({ticket.agence_code})</span>
                  </span>
                  {ticket.agence_origine_id !== ticket.agence_id && (
                    <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 w-fit mt-1">
                      Origine : {ticket.agence_origine_nom}
                    </span>
                  )}
                </div>
              </InfoRow>
              <InfoRow label="Processus">
                <span className="font-semibold text-cnps-800">{ticket.processus_code}</span>
                <span className="text-slate-500 ml-1">— {ticket.processus_libelle}</span>
              </InfoRow>
              <InfoRow label="Motif">
                <span className="font-medium">{ticket.motif_libelle}</span>
              </InfoRow>
              <InfoRow icon={Clock} label="Échéance">
                <span className={ticket.hors_sla ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                  {format(new Date(ticket.date_echeance_sla), 'dd/MM/yyyy', { locale: fr })}
                  {ticket.hors_sla && ' ⚠ DÉPASSÉ'}
                </span>
              </InfoRow>
              {ticket.regime_has_employeur !== false && (
                <InfoRow icon={Building2} label="Employeur">
                  <div className="flex flex-col">
                    <span>{ticket.partenaire_employeur}</span>
                    {ticket.partenaire_employeur_numero_cnps && (
                      <span className="text-[10px] text-slate-400 font-bold">N° CNPS: {ticket.partenaire_employeur_numero_cnps}</span>
                    )}
                  </div>
                </InfoRow>
              )}
              <InfoRow icon={User} label="Agent créateur">
                {ticket.agent_nom}
              </InfoRow>
              <InfoRow icon={Phone} label="Téléphone">
                <span className="font-mono">{ticket.partenaire_telephone}</span>
              </InfoRow>
              <InfoRow icon={Mail} label="Email">
                {ticket.partenaire_email || <span className="text-slate-400 italic">Non renseigné</span>}
              </InfoRow>
              <InfoRow icon={Tag} label="Régime">
                {ticket.regime_libelle}
              </InfoRow>
              <InfoRow icon={User} label="Type de client">
                {ticket.type_client_libelle}
              </InfoRow>
              <InfoRow icon={Clock} label="Sous-motif">
                <span className="font-medium text-orange-700">{ticket.sous_motif_libelle}</span>
              </InfoRow>
              {ticket.pilote_nom && (
                <InfoRow icon={User} label="Pilote assigné">
                  {ticket.pilote_nom}
                </InfoRow>
              )}
            </div>
            
            {ticket.description && (
              <div className="px-5 pb-5">
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">Description</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded p-3 border border-slate-100">
                  {ticket.description}
                </p>
              </div>
            )}

            {ticket.commentaire_agent && (
              <div className="px-5 pb-5 border-t border-slate-100/50 pt-4">
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">Commentaire interne de l'agent</p>
                <p className="text-sm text-slate-700 bg-violet-50/50 rounded p-3 border border-violet-100/60 whitespace-pre-wrap">
                  {ticket.commentaire_agent}
                </p>
              </div>
            )}
          </div>

          {/* Bloc de Qualification - Agence Digitale */}
          {canQualify && (
            <div className="card border-l-4 border-l-violet-600 bg-white shadow-xl rounded-[1.5rem] overflow-hidden my-5">
              <div className="card-header bg-gradient-to-r from-violet-50/50 to-indigo-50/30 border-b border-slate-100 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center shadow-sm">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Qualification de la réclamation</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Réservé aux agents de l'Agence Digitale</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-violet-100 text-violet-800 text-[9px] font-black uppercase rounded-lg tracking-wider">
                  Action Requise
                </div>
              </div>
              <div className="card-body p-6">
                <form onSubmit={handleQualify} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Processus */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Processus concerné *</label>
                      <select
                        required
                        value={qualifForm.processus_id}
                        onChange={e => setQualifForm(f => ({ ...f, processus_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-800 text-sm transition-all"
                      >
                        <option value="">— Sélectionner le processus —</option>
                        {qualifProcessus.filter(p => p.code !== 'NQ').map(p => (
                          <option key={p.id} value={p.id}>{p.libelle} ({p.code})</option>
                        ))}
                      </select>
                    </div>

                    {/* Motif */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Objet Principal *</label>
                      <select
                        required
                        value={qualifForm.motif_id}
                        onChange={e => setQualifForm(f => ({ ...f, motif_id: e.target.value, sous_motif_id: '' }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-800 text-sm transition-all"
                      >
                        <option value="">— Sélectionner le motif —</option>
                        {qualifMotifs.map(m => (
                          <option key={m.id} value={m.id}>{m.objet}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sous-motif */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Précision (Sous-motif) *</label>
                      <select
                        required
                        disabled={!qualifForm.motif_id}
                        value={qualifForm.sous_motif_id}
                        onChange={e => setQualifForm(f => ({ ...f, sous_motif_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-800 text-sm transition-all disabled:opacity-50"
                      >
                        <option value="">— Sélectionner la précision —</option>
                        {qualifSousMotifs.map(sm => (
                          <option key={sm.id} value={sm.id}>{sm.libelle}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Commentaire de l'agent */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Commentaire interne de l'agent (ne modifie pas la description client)</label>
                    <textarea
                      value={qualifForm.commentaire_agent}
                      onChange={e => setQualifForm(f => ({ ...f, commentaire_agent: e.target.value }))}
                      placeholder="Indiquez ici vos remarques, précisions ou consignes pour le traitement..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-800 text-sm transition-all min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Valider la qualification
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Actions de traitement */}
          {(actions.length > 0 || canAddAction || isPilote()) && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-slate-900">
                  Liste des corrections
                  <span className="ml-2 text-xs font-normal text-slate-400">({actions.length} action{actions.length > 1 ? 's' : ''})</span>
                </h2>
                {canAddAction && (
                  <button onClick={() => setShowActionModal(true)} className="btn-primary !py-1.5 !text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une action
                  </button>
                )}
              </div>
              {actions.length > 0 ? (
              <table className="table-cnps">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Structure sollicitée</th>
                    <th>Statut</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(action => (
                    <tr key={action.id}>
                      <td className="font-medium text-slate-800">{action.libelle}</td>
                      <td className="text-xs text-slate-500">{action.ressource_nom || '—'}</td>
                      <td>
                        <StatusBadge statut={action.statut} />
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500">{action.observations || '—'}</span>
                          {action.commentaire_cloture && (
                            <span className="mt-1 text-xs font-medium text-emerald-600 italic">
                              Réalisation : {action.commentaire_cloture}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPilote() && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser) && action.statut !== 'termine' && (
                            <>
                              <button
                                onClick={() => openEditModal(action)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Modifier l'action"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAction(action)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Supprimer l'action"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedAction(action); setShowClotureModal(true) }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                title="Marquer comme réalisé"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              ) : (
                <div className="p-6 text-center text-slate-400 text-sm italic border-t border-slate-100">
                  Aucune action de traitement n'a encore été enregistrée.
                </div>
              )}
            </div>
          )}

          {/* Historique Client (si existant) */}
          {clientHistory.length > 0 && (
            <div className="card shadow-sm border-blue-200 bg-blue-50/30 mb-6 mt-6">
              <div 
                className="card-header bg-blue-100/50 flex justify-between items-center p-4 cursor-pointer hover:bg-blue-200/50 transition-colors"
                onClick={() => setShowHistory(!showHistory)}
              >
                <h2 className="text-sm font-black uppercase text-blue-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-700" />
                  Historique du Client ({clientHistory.length})
                </h2>
                <button 
                  type="button" 
                  className="p-1 text-blue-700 hover:bg-blue-300/30 rounded-full transition-colors"
                >
                  {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
              {showHistory && (
                <div className="card-body p-4">
                  <div className="space-y-3">
                    {clientHistory.map(hist => (
                      <div key={hist.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <div className="font-black text-sm text-slate-800">
                            <Link to={`/reclamations/${hist.id}`} className="hover:text-blue-600 transition-colors" target="_blank">
                              {hist.numero_ticket}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{new Date(hist.created_at).toLocaleDateString()} - {hist.processus_libelle || 'Non qualifié'} ({hist.motif_libelle || '-'})</div>
                        </div>
                        <div>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {hist.statut.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gestion Documentaire (Pièces Jointes) */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-cnps-800" />
                Gestion Documentaire
                <span className="ml-2 text-xs font-normal text-slate-400">({attachments.length} fichier{attachments.length > 1 ? 's' : ''})</span>
              </h2>
              {!isAgent() && (isSuper() || isCoord() || ticket?.agence_id === user?.agence_id || isDigitalAgencyUser) && (
                <label className="btn-secondary !py-1 !text-xs cursor-pointer flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Ajouter des fichiers
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleUploadAttachment} 
                    disabled={saving}
                  />
                </label>
              )}
            </div>
            <div className="card-body">
              {attachments.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs italic">
                  Aucune pièce jointe associée à ce dossier.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(pj => (
                    <div key={pj.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white rounded shadow-sm text-cnps-800">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate" title={pj.nom_original}>
                            {pj.nom_original}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(pj.taille/1024).toFixed(1)} KB — par {pj.cree_par_nom}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={attachmentsApi.download(pj.id)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {((pj.cree_par == user?.id && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser)) || isSuper() || isCoord()) && (
                          <button 
                            onClick={() => handleDeleteAttachment(pj)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>



          {/* ─── Bloc Coordination (Remarques) ──────────────── */}
          {(isCoord() || isSuper() || ticket?.remarques_coordination) && (
            <div className="card mb-6 overflow-hidden border-l-4 border-l-violet-500 shadow-sm">
              <div className="card-header bg-violet-50/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-slate-800">Observations de la Coordination</h2>
                </div>
              </div>
              <div className="card-body">
              {(isCoord() || isSuper()) && ticket?.statut === 'a_valider' ? (
                <div className="space-y-3">
                    <textarea
                      className="form-input min-h-[100px] border-violet-200 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Saisissez vos remarques sur l'analyse ou les actions ici..."
                      value={remarquesCoordination}
                      onChange={e => setRemarquesCoordination(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveRemarques}
                        disabled={saving}
                        className="px-4 py-2 bg-violet-600 text-white rounded text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Enregistrer les remarques
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-violet-50 p-4 rounded-lg border border-violet-100 italic text-slate-700 whitespace-pre-wrap">
                    {ticket?.remarques_coordination || "Aucune remarque particulière."}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Colonne Droite (Traitement & Historique) ──────────────────────── */}
        <div className="xl:col-span-1 space-y-5">
          {/* Boutons d'actions métier */}
          <div className="flex flex-col gap-3">
            {canValidate && (
              <div className="flex items-center gap-2 p-3 bg-violet-50 text-violet-800 text-xs rounded-lg border border-violet-200 w-full font-medium shadow-sm">
                <CheckSquareIcon className="w-4 h-4 shrink-0 text-violet-600" />
                Dossier en attente de validation. Veuillez examiner l'analyse et les actions réalisées.
              </div>
            )}
            {isPilote() && ticket?.statut === 'en_cours' && ticket?.remarques_coordination && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200 w-full font-medium shadow-sm">
                <RotateCcw className="w-4 h-4 shrink-0 text-red-600" />
                Dossier retourné par la coordination. Veuillez prendre en compte les remarques.
              </div>
            )}
            {isPilote() && ['en_cours', 'nouveau'].includes(ticket.statut) && !isAnalyseDone && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 w-full shadow-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                L'analyse du problème doit être complétée avant soumission.
              </div>
            )}
            {isPilote() && ['en_cours', 'nouveau'].includes(ticket.statut) && !allActionsTerminated && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 w-full shadow-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                Au moins une action doit être enregistrée et réalisée.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {canTakeCharge && (
                <button onClick={handlePrendreEnCharge} disabled={saving} className="btn-primary w-full justify-center">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Prendre en charge
                </button>
              )}
              {canSubmit && (
                <button onClick={handleSoumettre} disabled={saving} className="btn-primary !bg-violet-700 w-full justify-center !hover:bg-violet-800">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Soumettre à validation
                </button>
              )}
              {isPilote() && (ticket?.agence_id === user?.agence_id || isDigitalAgencyUser) && ['en_cours', 'nouveau'].includes(ticket.statut) && (
                <button 
                  onClick={() => setShowEscaladeModal(true)} 
                  disabled={saving} 
                  className="btn-secondary w-full justify-center !text-orange-700 !border-orange-200 hover:!bg-orange-50"
                >
                  <RotateCcw className="w-4 h-4 rotate-90" />
                  Escalader le dossier
                </button>
              )}
              {canValidate && (
                <>
                  <button onClick={() => { setValidationMode('valider'); setShowValidationModal(true) }} className="btn-success flex-1 justify-center">
                    <CheckCircle className="w-4 h-4" />
                    Clôturer
                  </button>
                  <button onClick={() => { setValidationMode('retourner'); setShowValidationModal(true) }} className="btn-danger flex-1 justify-center">
                    <RotateCcw className="w-4 h-4" />
                    Retourner
                  </button>
                </>
              )}
            </div>

            {/* Documents officiels */}
            <div className="w-full flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Docs officiels :</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => generateReclamationPDF(ticket, 'accuse')}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-cnps-800 hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Accusé
                </button>
                {(ticket.statut === 'resolu' || ticket.statut === 'rejete') && (
                  <button 
                    onClick={() => generateReclamationPDF(ticket, 'reponse')}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-cnps-800 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Réponse
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Analyse du problème */}
          {(!isAgent() || isAnalyseDone) && (
            <div className="card border-t-4 border-t-orange-500">
              <div className="card-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Analyse
                </h2>
                {canEditAnalyse && (
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setShowSuggestionsModal(true)}
                      className="btn-secondary !px-2 !py-1 !text-[10px] !bg-indigo-50 !text-indigo-700 !border-indigo-100 hover:!bg-indigo-100"
                    >
                      <Lightbulb className="w-3 h-3" />
                      Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
                    </button>
                    <button 
                      onClick={handleSaveAnalyse} 
                      disabled={saving}
                      className="btn-primary !px-2 !py-1 !text-[10px] !bg-orange-600 hover:!bg-orange-700"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
              <div className="card-body space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="form-label text-[10px]">Catégorie</label>
                    <select
                      value={analyseForm.categorie_cause_id}
                      onChange={e => setAnalyseForm(f => ({ ...f, categorie_cause_id: e.target.value, cause_id: '' }))}
                      disabled={!canEditAnalyse}
                      className="form-select text-sm py-1.5"
                    >
                      <option value="">— Sélectionner —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-[10px]">Cause</label>
                    <select
                      value={analyseForm.cause_id}
                      onChange={e => setAnalyseForm(f => ({ ...f, cause_id: e.target.value }))}
                      disabled={!analyseForm.categorie_cause_id || !canEditAnalyse}
                      className="form-select text-sm py-1.5"
                    >
                      <option value="">— Sélectionner —</option>
                      {causes.map(c => (
                        <option key={c.id} value={c.id}>{c.libelle}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label text-[10px]">Commentaire</label>
                  <textarea
                    value={analyseForm.analyse_commentaire}
                    onChange={e => setAnalyseForm(f => ({ ...f, analyse_commentaire: e.target.value }))}
                    disabled={!canEditAnalyse}
                    className="form-input h-24 resize-none text-sm"
                    placeholder="Détaillez ici la cause..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="card sticky top-6">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900">Historique</h2>
              <span className="text-xs text-slate-400">{historique.length} événement{historique.length > 1 ? 's' : ''}</span>
            </div>
            <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              <Timeline historique={historique} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modale : Ajouter / Modifier une action ─────────── */}
      <Modal 
        isOpen={showActionModal} 
        onClose={() => { setShowActionModal(false); setEditingAction(null) }} 
        title={editingAction ? "Modifier l'action de traitement" : "Ajouter une action de traitement"}
      >
        <form onSubmit={handleAjouterAction} className="space-y-4">
          <div>
            <label className="form-label">Libellé de l'action *</label>
            <input
              type="text"
              required
              value={actionForm.libelle}
              onChange={e => setActionForm(f => ({ ...f, libelle: e.target.value }))}
              className="form-input"
              placeholder="Ex: Vérification des droits acquis..."
            />
          </div>
          <div>
            <label className="form-label">Structure sollicitée</label>
            <select
              value={actionForm.ressource_id}
              onChange={e => setActionForm(f => ({ ...f, ressource_id: e.target.value }))}
              className="form-select"
            >
              <option value="">— Sélectionner —</option>
              {agences.map(a => (
                <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Observations</label>
            <textarea
              value={actionForm.observations}
              onChange={e => setActionForm(f => ({ ...f, observations: e.target.value }))}
              className="form-input h-20 resize-none"
              placeholder="Notes complémentaires..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setShowActionModal(false); setEditingAction(null) }} 
              className="btn-secondary"
            >
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingAction ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingAction ? "Mettre à jour" : "Ajouter l'action"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modale : Validation / Retour ───────────────────── */}
      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title={validationMode === 'valider' ? 'Clôturer la réclamation' : 'Retourner au pilote'}
      >
        <form onSubmit={handleValidation} className="space-y-4">
          <div>
            <label className="form-label">Commentaire / Justification *</label>
            <textarea
              required
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              className="form-input h-24"
              placeholder={validationMode === 'valider' ? "Observations finales avant clôture..." : "Expliquez au pilote les raisons du retour..."}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowValidationModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className={validationMode === 'valider' ? "btn-success" : "btn-danger"}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : validationMode === 'valider' ? <CheckCircle className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
              {validationMode === 'valider' ? "Valider et Clôturer" : "Confirmer le retour"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modale : Escalade ───────────────────────────── */}
      <Modal
        isOpen={showEscaladeModal}
        onClose={() => setShowEscaladeModal(false)}
        title="Escalader la réclamation"
      >
        <form onSubmit={handleEscalader} className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200 shadow-sm">
            L'escalade permet de transférer ce dossier à une autre agence ou structure centrale si vous ne pouvez pas le traiter localement. 
            <strong> Le dossier sera remis au statut 'Nouveau' dans l'agence cible.</strong>
          </div>
          <div>
            <label className="form-label">Structure / Agence cible *</label>
            <select
              required
              className="form-select"
              value={escaladeForm.agence_cible_id}
              onChange={e => setEscaladeForm(f => ({ ...f, agence_cible_id: e.target.value }))}
            >
              <option value="">— Sélectionner la cible —</option>
              {agences.filter(a => a.id !== ticket.agence_id).map(a => (
                <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Motif de l'escalade *</label>
            <textarea
              required
              value={escaladeForm.commentaire}
              onChange={e => setEscaladeForm(f => ({ ...f, commentaire: e.target.value }))}
              className="form-input h-24"
              placeholder="Expliquez pourquoi ce dossier doit être traité par une autre structure..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEscaladeModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary !bg-orange-600 hover:!bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirmer l'escalade
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modale : Clôturer une action ─────────────────────── */}
      <Modal isOpen={showClotureModal} onClose={() => setShowClotureModal(false)} title="Marquer l'action comme réalisée">
        <form onSubmit={handleCloturerAction} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
            <strong>Action :</strong> {selectedAction?.libelle}
          </div>
          <div>
            <label className="form-label">Commentaire de réalisation (optionnel)</label>
            <textarea
              value={clotureCommentaire}
              onChange={e => setClotureCommentaire(e.target.value)}
              className="form-input h-24 resize-none"
              placeholder="Détaillez ici les résultats ou observations suite à la réalisation..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowClotureModal(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-success">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirmer la réalisation
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modale : Base de Connaissances ───────────────────── */}
      <Modal 
        isOpen={showSuggestionsModal} 
        onClose={() => setShowSuggestionsModal(false)} 
        title="Suggestions de réponses (Base de Connaissances)"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <p className="text-xs text-slate-500 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
            Les suggestions ci-dessous sont sélectionnées en fonction du motif et de la cause de cette réclamation. Cliquez sur "Utiliser" pour copier le texte dans votre analyse.
          </p>

          {loadingSuggestions ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-10">
              <Lightbulb className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Aucune suggestion trouvée pour ce contexte.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map(s => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-300 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 text-sm">{s.titre}</h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-indigo-100 text-indigo-700">
                      RÉFÉRENCE TYPE
                    </span>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Analyse :</p>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded italic leading-relaxed">"{s.analyse_type}"</p>
                  </div>
                  {(typeof s.actions_types === 'string' ? JSON.parse(s.actions_types) : s.actions_types).length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Actions suggérées :</p>
                      <div className="flex flex-wrap gap-1">
                        {(typeof s.actions_types === 'string' ? JSON.parse(s.actions_types) : s.actions_types).map((a, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            • {a.libelle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => handleUseSuggestion(s)}
                    className="w-full btn-secondary !py-1.5 !text-xs !bg-indigo-600 !text-white !border-transparent hover:!bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Importer l'analyse et les actions
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── Composant helper pour les lignes d'info ──────────────────
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}
