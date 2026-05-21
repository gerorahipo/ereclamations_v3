import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicApi } from '../api'
import { ArrowLeft, Save, Loader2, User, Building2, Tag, Layers, FileText, CheckCircle, MapPin, Phone, Mail, Search, Paperclip, X } from 'lucide-react'
import { useAlert } from '../context/AlertContext.jsx'
import clsx from 'clsx'

export default function PublicDeclaration() {
  const navigate = useNavigate()
  const swal = useAlert()

  // Data lists
  const [regimes, setRegimes]           = useState([])
  const [typesClients, setTypesClients] = useState([])
  const [processus, setProcessus]       = useState([])
  const [motifs, setMotifs]             = useState([])
  const [sousMotifs, setSousMotifs]     = useState([])
  const [agences, setAgences]           = useState([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1) // 1: Client, 2: Reclamation
  const [files, setFiles] = useState([])

  const [form, setForm] = useState({
    regime_id: '',
    type_client_id: '',
    partenaire_identifiant: '',
    partenaire_nom_prenoms: '',
    partenaire_sexe: 'M',
    partenaire_telephone: '',
    partenaire_email: '',
    partenaire_employeur: '',
    partenaire_raison_sociale: '', // New field for companies
    processus_id: '',
    motif_id: '',
    sous_motif_id: '',
    agence_id: '',
    description: '',
  })
  const [checkingId, setCheckingId] = useState(false)

  // Initial loads
  useEffect(() => {
    publicApi.init().then(res => {
      setRegimes(res.regimes || [])
      setProcessus(res.processus || [])
      setAgences(res.agences || [])
      setLoading(false)
    }).catch(err => {
      swal.error("Erreur", "Impossible de charger les données du portail.")
      setLoading(false)
    })
  }, [])

  // Linked: Regime -> Types Clients
  useEffect(() => {
    if (form.regime_id) {
      publicApi.typesClients({ regime_id: form.regime_id }).then(d => setTypesClients(d?.data || []))
    } else {
      setTypesClients([])
    }
    setForm(f => ({ ...f, type_client_id: '' }))
  }, [form.regime_id])

  // Linked: Regime & Type Client -> Motifs
  useEffect(() => {
    if (form.regime_id && form.type_client_id) {
      publicApi.motifs({ 
        regime_id: form.regime_id,
        type_client_id: form.type_client_id
      }).then(d => setMotifs(d?.data || []))
    } else {
      setMotifs([])
    }
    setForm(f => ({ ...f, motif_id: '', sous_motif_id: '' }))
  }, [form.regime_id, form.type_client_id])

  // Linked: Motif -> Sous-motifs
  useEffect(() => {
    if (form.motif_id) {
      publicApi.sousMotifs({ motif_id: form.motif_id }).then(d => setSousMotifs(d?.data || []))
    } else {
      setSousMotifs([])
    }
    setForm(f => ({ ...f, sous_motif_id: '' }))
  }, [form.motif_id])

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleCheckIdentifier = async () => {
    if (!form.partenaire_identifiant) return
    if (!form.type_client_id) {
      swal.warning("Attention", "Veuillez d'abord sélectionner votre type de client.")
      return
    }
    setCheckingId(true)
    try {
      const res = await publicApi.checkIdentifier(form.partenaire_identifiant, form.type_client_id)
      if (res.found) {
        const d = res.data
        if (d.type === 'entreprise') {
          setForm(f => ({
            ...f,
            partenaire_raison_sociale: d.raison_sociale,
            partenaire_employeur: d.nom_employeur,
            partenaire_telephone: d.telephone || f.partenaire_telephone,
            partenaire_email: d.email || f.partenaire_email
          }))
          swal.success("Trouvé", `Entreprise identifiée : ${d.raison_sociale}`)
        } else {
          setForm(f => ({
            ...f,
            partenaire_nom_prenoms: `${d.nom} ${d.prenoms}`,
            partenaire_telephone: d.telephone || f.partenaire_telephone,
            partenaire_email: d.email || f.partenaire_email
          }))
          swal.success("Trouvé", `Client identifié : ${d.nom} ${d.prenoms}`)
        }
      } else {
        swal.error("Non trouvé", res.error || "Le numéro saisi n'est pas trouvé dans notre base.")
      }
    } catch (err) {
      swal.error("Erreur", "Une erreur est survenue lors de la vérification.")
    } finally {
      setCheckingId(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          formData.append(key, value)
        }
      })
      files.forEach(f => formData.append('files[]', f))

      const res = await publicApi.declare(formData)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      await swal.success("Déclaration envoyée", `Votre réclamation a été enregistrée sous le numéro : ${res.numero_ticket}. Conservez précieusement ce numéro pour le suivi.`)
      navigate(`/tracking?numero=${res.numero_ticket}`)
    } catch (err) {
      swal.error("Erreur", err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-cnps-800 animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Chargement du portail...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3 cursor-pointer" onClick={() => navigate('/tracking')}>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cnps-800 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-black text-lg lg:text-xl shadow-lg shadow-cnps-100">C</div>
            <div>
              <h1 className="text-xs lg:text-sm font-black text-slate-800 uppercase tracking-tighter">eRéclamations</h1>
              <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portail Client</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/tracking')}
            className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest hover:text-cnps-800 flex items-center gap-1 lg:gap-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4" /> 
            <span className="hidden sm:inline">Retour au suivi</span>
            <span className="sm:hidden text-[9px]">Suivi</span>
          </button>
        </div>
      </header>

      <main className="flex-1 py-6 lg:py-12 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12">
          {/* Progress Header */}
          <div className="text-center space-y-3 lg:space-y-4">
            <h2 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">Déclarer une <span className="text-cnps-800">réclamation</span></h2>
            <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto">Veuillez remplir le formulaire ci-dessous pour nous faire part de votre préoccupation.</p>
            
            <div className="flex items-center justify-center gap-2 lg:gap-4 mt-6 lg:mt-8 scale-90 sm:scale-100">
              <div className={clsx(
                "flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-2xl font-black uppercase text-[9px] lg:text-[10px] tracking-widest transition-all",
                step === 1 ? "bg-cnps-800 text-white shadow-xl shadow-cnps-100" : "bg-white text-slate-400 border border-slate-100"
              )}>
                <span className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", step === 1 ? "bg-white text-cnps-800" : "bg-slate-100")}>1</span>
                <span className="hidden sm:inline">Vos Informations</span>
                <span className="sm:hidden">Infos</span>
              </div>
              <div className="w-4 lg:w-8 h-[2px] bg-slate-100" />
              <div className={clsx(
                "flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-2xl font-black uppercase text-[9px] lg:text-[10px] tracking-widest transition-all",
                step === 2 ? "bg-cnps-800 text-white shadow-xl shadow-cnps-100" : "bg-white text-slate-400 border border-slate-100"
              )}>
                <span className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", step === 2 ? "bg-white text-cnps-800" : "bg-slate-100")}>2</span>
                <span className="hidden sm:inline">Votre Réclamation</span>
                <span className="sm:hidden">Réclamation</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
            {/* STEP 1: CLIENT INFORMATIONS */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right duration-500 space-y-6 lg:space-y-8">
                <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                  <div className="p-5 lg:p-12 space-y-8 lg:space-y-10">
                    {/* Identity Section */}
                    <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cnps-50 rounded-lg lg:rounded-xl flex items-center justify-center text-cnps-800">
                          <User className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <h3 className="text-lg lg:text-xl font-black text-slate-800 uppercase tracking-tight">Identification</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Votre Régime *</label>
                          <select 
                            required
                            value={form.regime_id}
                            onChange={e => handleChange('regime_id', e.target.value)}
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 transition-all text-sm lg:text-base"
                          >
                            <option value="">— Sélectionner le régime —</option>
                            {regimes.map(r => <option key={r.id} value={r.id}>{r.libelle}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Type de client *</label>
                          <select 
                            required
                            disabled={!form.regime_id}
                            value={form.type_client_id}
                            onChange={e => handleChange('type_client_id', e.target.value)}
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 disabled:opacity-50 transition-all text-sm lg:text-base"
                          >
                            <option value="">— Sélectionner le type —</option>
                            {typesClients.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Numéro CNPS / Identifiant</label>
                        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                          <input 
                            type="text"
                            value={form.partenaire_identifiant}
                            onChange={e => handleChange('partenaire_identifiant', e.target.value)}
                            placeholder="Ex: 123456789"
                            className="flex-1 px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                          />
                          <button 
                            type="button"
                            onClick={handleCheckIdentifier}
                            disabled={checkingId || !form.partenaire_identifiant}
                            className="w-full sm:w-auto px-6 lg:px-8 py-3.5 lg:py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {checkingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                            Vérifier
                          </button>
                        </div>
                      </div>

                      {/* Display name/raison sociale based on type client or if it was found */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        {form.type_client_id && typesClients.find(t => t.id == form.type_client_id)?.libelle?.toLowerCase()?.includes('entreprise') ? (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Raison Sociale *</label>
                            <input 
                              required
                              type="text"
                              value={form.partenaire_raison_sociale}
                              onChange={e => handleChange('partenaire_raison_sociale', e.target.value)}
                              placeholder="Nom de l'entreprise"
                              className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nom et Prénoms *</label>
                            <input 
                              required
                              type="text"
                              value={form.partenaire_nom_prenoms}
                              onChange={e => handleChange('partenaire_nom_prenoms', e.target.value)}
                              placeholder="Votre nom complet"
                              className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Sexe *</label>
                          <div className="flex gap-3 lg:gap-4 p-1 lg:p-2">
                            <label className={clsx(
                              "flex-1 flex items-center justify-center gap-2 py-3 lg:py-4 rounded-2xl font-bold cursor-pointer border-2 transition-all text-sm lg:text-base",
                              form.partenaire_sexe === 'M' ? "bg-cnps-50 border-cnps-800 text-cnps-800" : "bg-white border-slate-100 text-slate-400"
                            )}>
                              <input type="radio" className="hidden" checked={form.partenaire_sexe === 'M'} onChange={() => handleChange('partenaire_sexe', 'M')} />
                              Masculin
                            </label>
                            <label className={clsx(
                              "flex-1 flex items-center justify-center gap-2 py-3 lg:py-4 rounded-2xl font-bold cursor-pointer border-2 transition-all text-sm lg:text-base",
                              form.partenaire_sexe === 'F' ? "bg-cnps-50 border-cnps-800 text-cnps-800" : "bg-white border-slate-100 text-slate-400"
                            )}>
                              <input type="radio" className="hidden" checked={form.partenaire_sexe === 'F'} onChange={() => handleChange('partenaire_sexe', 'F')} />
                              Féminin
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nom de l'employeur / Responsable</label>
                        <input 
                          type="text"
                          value={form.partenaire_employeur}
                          onChange={e => handleChange('partenaire_employeur', e.target.value)}
                          placeholder="Nom du responsable ou de l'employeur"
                          className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                        />
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Contact Section */}
                    <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cnps-50 rounded-lg lg:rounded-xl flex items-center justify-center text-cnps-800">
                          <Phone className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <h3 className="text-lg lg:text-xl font-black text-slate-800 uppercase tracking-tight">Coordonnées</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Téléphone *</label>
                          <input 
                            required
                            type="tel"
                            value={form.partenaire_telephone}
                            onChange={e => handleChange('partenaire_telephone', e.target.value)}
                            placeholder="Ex: 01 02 03 04 05"
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Email</label>
                          <input 
                            type="email"
                            value={form.partenaire_email}
                            onChange={e => handleChange('partenaire_email', e.target.value)}
                            placeholder="votre@email.com"
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all text-sm lg:text-base"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          if ((form.partenaire_nom_prenoms || form.partenaire_raison_sociale) && form.partenaire_telephone && form.type_client_id) setStep(2)
                          else swal.warning("Champs requis", "Veuillez renseigner votre type de client, votre nom (ou raison sociale) et votre numéro de téléphone.")
                        }}
                        className="w-full sm:w-auto bg-cnps-800 text-white px-8 lg:px-12 py-4 lg:py-5 rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-cnps-900 transition-all shadow-xl shadow-cnps-200"
                      >
                        Continuer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RECLAMATION DETAILS */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right duration-500 space-y-6 lg:space-y-8 pb-20">
                <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                  <div className="p-5 lg:p-12 space-y-8 lg:space-y-10">
                    {/* Motif Section */}
                    <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cnps-50 rounded-lg lg:rounded-xl flex items-center justify-center text-cnps-800">
                          <Tag className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <h3 className="text-lg lg:text-xl font-black text-slate-800 uppercase tracking-tight">Motif de la réclamation</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Objet principal *</label>
                          <select 
                            required
                            disabled={!form.type_client_id}
                            value={form.motif_id}
                            onChange={e => handleChange('motif_id', e.target.value)}
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 disabled:opacity-50 transition-all text-sm lg:text-base"
                          >
                            <option value="">— Sélectionner l'objet —</option>
                            {motifs.map(m => <option key={m.id} value={m.id}>{m.objet}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Précision (Sous-motif) *</label>
                          <select 
                            required
                            disabled={!form.motif_id}
                            value={form.sous_motif_id}
                            onChange={e => handleChange('sous_motif_id', e.target.value)}
                            className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 disabled:opacity-50 transition-all text-sm lg:text-base"
                          >
                            <option value="">— Sélectionner la précision —</option>
                            {sousMotifs.map(sm => <option key={sm.id} value={sm.id}>{sm.libelle}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Description détaillée du problème *</label>
                        <textarea 
                          required
                          value={form.description}
                          onChange={e => handleChange('description', e.target.value)}
                          placeholder="Décrivez précisément les faits, les dates, les montants, etc."
                          className="w-full px-4 lg:px-6 py-3.5 lg:py-4 rounded-2xl lg:rounded-3xl bg-slate-50 border-none focus:ring-2 focus:ring-cnps-800/20 font-bold text-slate-800 placeholder:text-slate-300 transition-all min-h-[150px] lg:min-h-[200px] resize-none text-sm lg:text-base"
                        />
                      </div>
                    </div>

                    {/* Pièces Jointes Section */}
                    <div className="space-y-4 lg:space-y-6 pt-4 lg:pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-50 rounded-lg lg:rounded-xl flex items-center justify-center text-slate-500">
                            <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg lg:text-xl font-black text-slate-800 uppercase tracking-tight">Pièces Jointes</h3>
                            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Facultatif • Max 5MB / fichier</p>
                          </div>
                        </div>
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 lg:px-6 lg:py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center gap-2">
                          <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                            onChange={e => {
                              if (e.target.files) {
                                setFiles(prev => [...prev, ...Array.from(e.target.files)])
                              }
                            }}
                          />
                          <Paperclip className="w-3 h-3" />
                          Ajouter
                        </label>
                      </div>

                      {files.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setFiles(f => f.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-4 lg:pt-8">
                      <button 
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest hover:text-cnps-800 transition-colors order-2 sm:order-1"
                      >
                        Retour aux infos personnelles
                      </button>
                      <button 
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto bg-cnps-800 text-white px-8 lg:px-12 py-4 lg:py-5 rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-cnps-900 transition-all shadow-xl shadow-cnps-200 disabled:opacity-50 flex items-center justify-center gap-3 order-1 sm:order-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Envoi..." : "Envoyer ma déclaration"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-4">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Vérification finale</h4>
                    <p className="text-xs text-amber-700 font-medium">Une fois envoyée, votre réclamation sera immédiatement transmise à nos services compétents pour traitement.</p>
                  </div>
                </div>
              </div>
            )}
          </form>
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
