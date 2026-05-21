import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { reclamationsApi, parametrageApi, attachmentsApi } from '../api/index.js'
import { ArrowLeft, Save, Loader2, User, Building2, Tag, Layers, FileText, Paperclip, CheckCircle, Search, Clock, AlertTriangle, History, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlert } from '../context/AlertContext.jsx'

export default function NouvelleReclamation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const swal = useAlert()

  // Data lists
  const [regimes, setRegimes]           = useState([])
  const [typesClients, setTypesClients] = useState([])
  const [modesSaisine, setModesSaisine] = useState([])
  const [processus, setProcessus]       = useState([])
  const [motifs, setMotifs]             = useState([])
  const [sousMotifs, setSousMotifs]     = useState([])

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [checkingId, setCheckingId] = useState(false)
  const [clientHistory, setClientHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)

  const [form, setForm] = useState({
    partenaire_type: 'entreprise',
    partenaire_nom_prenoms: '',
    partenaire_raison_sociale: '',
    partenaire_identifiant: '',
    partenaire_sexe: '',
    partenaire_telephone: '',
    partenaire_email: '',
    partenaire_employeur: '',
    partenaire_employeur_numero_cnps: '',
    regime_id:       '',
    type_client_id:  '',
    mode_saisine_id: '',
    processus_id:    '',
    motif_id:        '',
    sous_motif_id:   '',
    date_reception:  new Date().toISOString().split('T')[0],
    description:     '',
  })

  // Initial loads
  useEffect(() => {
    parametrageApi.regimes().then(d => setRegimes(d?.data || []))
    parametrageApi.modesSaisine().then(d => setModesSaisine(d?.data || []))
    parametrageApi.processus().then(d => setProcessus(d?.data || []))
  }, [])

  // Linked: Regime -> Types Clients
  useEffect(() => {
    if (form.regime_id) {
      parametrageApi.typesClients({ regime_id: form.regime_id }).then(d => setTypesClients(d?.data || []))
    } else {
      setTypesClients([])
    }
    setForm(f => ({ ...f, type_client_id: '' }))
  }, [form.regime_id])

  // Linked: Regime & Type Client -> Motifs
  useEffect(() => {
    if (form.regime_id && form.type_client_id) {
      parametrageApi.motifs({ 
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
      parametrageApi.sousMotifs({ motif_id: form.motif_id }).then(setSousMotifs)
    } else {
      setSousMotifs([])
    }
    setForm(f => ({ ...f, sous_motif_id: '' }))
  }, [form.motif_id])

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleCheckIdentifier = async () => {
    if (!form.partenaire_identifiant) return
    if (!form.type_client_id) {
      swal.warning("Attention", "Veuillez d'abord sélectionner le type de client.")
      return
    }
    setCheckingId(true)
    try {
      const { publicApi } = await import('../api/index.js')
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
        await fetchClientHistory(form.partenaire_identifiant)
      } else {
        swal.error("Non trouvé", res.error || "Le numéro saisi n'est pas trouvé dans notre base.")
      }
    } catch (err) {
      swal.error("Erreur", "Une erreur est survenue lors de la vérification.")
    } finally {
      setCheckingId(false)
    }
  }

  const fetchClientHistory = async (identifiant) => {
    const idToCheck = identifiant || form.partenaire_identifiant;
    if (!idToCheck) return;
    try {
      const hist = await reclamationsApi.history(idToCheck)
      setClientHistory(hist || [])
      if (!identifiant) {
        // Only show explicit popup if triggered manually via the new button
        if (hist && hist.length > 0) {
          swal.success("Historique trouvé", `${hist.length} réclamation(s) trouvée(s) pour ce client.`)
          setShowHistory(true)
        } else {
          swal.info("Aucun historique", "Ce client n'a aucune réclamation antérieure.")
        }
      }
    } catch(e) {
      console.error("Erreur historique", e)
      if (!identifiant) {
        swal.error("Erreur", "Impossible de récupérer l'historique.")
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.partenaire_nom_prenoms && !form.partenaire_raison_sociale) {
      setError('Veuillez renseigner au moins le Nom et Prénoms ou la Raison sociale');
      return;
    }
    if (!form.sous_motif_id) { setError('Veuillez remplir tous les champs obligatoires'); return }
    setSaving(true)
    setError('')
    try {
      const res = await reclamationsApi.create(form)
      
      // Upload des pièces jointes si présentes
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        selectedFiles.forEach(file => {
          formData.append('files[]', file)
        })
        await attachmentsApi.upload(res.id, formData)
      }

      await swal.success("Réclamation créée", "La réclamation a été enregistrée et imputée avec succès.")
      navigate(`/reclamations/${res.id}`)
    } catch (err) {
      swal.error("Erreur de création", err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedRegime = regimes.find(r => r.id == form.regime_id)
  const showEmployeurInfo = selectedRegime ? (selectedRegime.has_employeur ?? true) : true

  useEffect(() => {
    if (!showEmployeurInfo) {
      setForm(f => ({
        ...f,
        partenaire_raison_sociale: '',
        partenaire_employeur: '',
        partenaire_employeur_numero_cnps: ''
      }))
    }
  }, [showEmployeurInfo])

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="btn-secondary !px-2 !py-1.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">Nouvelle réclamation</h1>
          <p className="text-sm text-slate-500">
            Saisie par : {user?.prenoms} {user?.nom} — {user?.agence_nom}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: RÉFÉRENCES DU CLIENT */}
        <div className="card shadow-sm border-slate-200">
          <div className="card-header bg-slate-50/50">
            <h2 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-cnps-800" />
              RÉFÉRENCES DU CLIENT
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* Row 0: Régime & Type client (PRIORITY FOR LOOKUP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-cnps-50/30 rounded-xl border border-cnps-100">
              <div>
                <label className="text-[10px] font-black uppercase text-cnps-800 tracking-widest mb-2 block">Régime *</label>
                <select
                  required
                  value={form.regime_id}
                  onChange={e => handleChange('regime_id', e.target.value)}
                  className="form-select font-bold border-cnps-200"
                >
                  <option value="">— Sélectionner le régime —</option>
                  {regimes.map(r => <option key={r.id} value={r.id}>{r.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-cnps-800 tracking-widest mb-2 block">Type de client *</label>
                <select
                  required
                  value={form.type_client_id}
                  onChange={e => handleChange('type_client_id', e.target.value)}
                  disabled={!form.regime_id}
                  className="form-select font-bold border-cnps-200 disabled:opacity-50"
                >
                  <option value="">— Sélectionner le type —</option>
                  {typesClients.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                </select>
              </div>
            </div>

            {/* Row 1: Identifiant & Check */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Identifiant (N° CNPS/N°Sinistre) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.partenaire_identifiant}
                    onChange={e => handleChange('partenaire_identifiant', e.target.value)}
                    className="form-input font-bold flex-1"
                    placeholder="Ex: 123456789"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={handleCheckIdentifier}
                      disabled={checkingId || !form.partenaire_identifiant}
                      className="btn-secondary !py-2 !px-3"
                      title="Vérifier l'identité"
                    >
                      {checkingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => fetchClientHistory()}
                      disabled={checkingId || !form.partenaire_identifiant}
                      className="btn-secondary !py-2 !px-3"
                      title="Chercher l'historique de ce client"
                    >
                      <History className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Nom/Prénoms & Raison Sociale (RESULT) */}
            <div className={`grid grid-cols-1 ${showEmployeurInfo ? 'md:grid-cols-2' : ''} gap-6`}>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Nom et Prénoms</label>
                <input
                  type="text"
                  value={form.partenaire_nom_prenoms}
                  onChange={e => handleChange('partenaire_nom_prenoms', e.target.value)}
                  disabled={!!form.partenaire_raison_sociale}
                  className="form-input font-bold disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  placeholder={form.partenaire_raison_sociale ? "Désactivé (Raison sociale déjà saisie)" : "Saisissez le nom et prénoms..."}
                />
              </div>
              
              {showEmployeurInfo && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Raison sociale</label>
                  <input
                    type="text"
                    value={form.partenaire_raison_sociale}
                    onChange={e => handleChange('partenaire_raison_sociale', e.target.value)}
                    disabled={!!form.partenaire_nom_prenoms}
                    className="form-input font-bold disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    placeholder={form.partenaire_nom_prenoms ? "Désactivé (Nom/Prénoms déjà saisis)" : "Saisissez la raison sociale..."}
                  />
                </div>
              )}
            </div>

            {/* Row 3: Employeur & N° CNPS Employeur */}
            {showEmployeurInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Employeur *</label>
                  <input
                    type="text"
                    required
                    value={form.partenaire_employeur}
                    onChange={e => handleChange('partenaire_employeur', e.target.value)}
                    className="form-input font-bold"
                    placeholder="Nom de l'employeur..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">N° CNPS de l'employeur</label>
                  <input
                    type="text"
                    value={form.partenaire_employeur_numero_cnps}
                    onChange={e => handleChange('partenaire_employeur_numero_cnps', e.target.value)}
                    className="form-input font-bold"
                    placeholder="Ex: 0123456789"
                  />
                </div>
              </div>
            )}

            {/* Row 3.5: Téléphone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">N° de téléphone *</label>
                <input
                  type="tel"
                  required
                  value={form.partenaire_telephone}
                  onChange={e => handleChange('partenaire_telephone', e.target.value)}
                  className="form-input font-bold font-mono"
                  placeholder="Ex: 0102030405"
                />
              </div>
            </div>

            {/* Row 4: Sexe & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Sexe *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input type="radio" required checked={form.partenaire_sexe === 'M'} onChange={() => handleChange('partenaire_sexe', 'M')} className="text-cnps-800 focus:ring-cnps-800" /> Masculin
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input type="radio" required checked={form.partenaire_sexe === 'F'} onChange={() => handleChange('partenaire_sexe', 'F')} className="text-cnps-800 focus:ring-cnps-800" /> Féminin
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Adresse Mail</label>
                <input
                  type="email"
                  value={form.partenaire_email}
                  onChange={e => handleChange('partenaire_email', e.target.value)}
                  className="form-input font-bold"
                  placeholder="Ex: contact@email.com"
                />
              </div>
            </div>
          </div>
        </div>

        {clientHistory.length > 0 && (
          <div className="card shadow-sm border-blue-200 bg-blue-50/30">
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
                        <div className="font-black text-sm text-slate-800">{hist.numero_ticket}</div>
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

        {/* SECTION 2: RÉFÉRENCES DE LA RECLAMATION */}
        <div className="card shadow-sm border-slate-200">
          <div className="card-header bg-slate-50/50">
            <h2 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cnps-800" />
              RÉFÉRENCES DE LA RECLAMATION
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* Row 1: Mode saisine & Date réception */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Mode de saisine *</label>
                <select
                  required
                  value={form.mode_saisine_id}
                  onChange={e => handleChange('mode_saisine_id', e.target.value)}
                  className="form-select font-bold"
                >
                  <option value="">— Sélectionner le mode —</option>
                  {modesSaisine.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Date réception (jj/mm/aaaa) *</label>
                <input
                  type="date"
                  required
                  value={form.date_reception}
                  onChange={e => handleChange('date_reception', e.target.value)}
                  className="form-input font-bold"
                />
              </div>
            </div>

            {/* Row 2: Motifs & Sous-motifs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Motifs de réclamations *</label>
                <select
                  required
                  value={form.motif_id}
                  onChange={e => handleChange('motif_id', e.target.value)}
                  disabled={!form.regime_id || !form.type_client_id}
                  className="form-select font-bold disabled:opacity-50"
                >
                  <option value="">— Sélectionner le motif —</option>
                  {motifs.map(m => (
                    <option key={m.id} value={m.id}>{m.libelle}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Sous motifs (Délai) *</label>
                <select
                  required
                  value={form.sous_motif_id}
                  onChange={e => handleChange('sous_motif_id', e.target.value)}
                  disabled={!form.motif_id}
                  className="form-select font-bold disabled:opacity-50 border-orange-200 bg-orange-50/30"
                >
                  <option value="">— Sélectionner le sous-motif —</option>
                  {sousMotifs.map(sm => (
                    <option key={sm.id} value={sm.id}>
                      {sm.libelle} (Délai: {sm.delai_traitement_jours} jours)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Processus & Commentaire */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Processus métier concerné *</label>
                <select
                  required
                  value={form.processus_id}
                  onChange={e => handleChange('processus_id', e.target.value)}
                  className="form-select font-bold text-cnps-800"
                >
                  <option value="">— Sélectionner le processus —</option>
                  {processus.map(p => <option key={p.id} value={p.id}>{p.code} - {p.libelle}</option>)}
                </select>
                
                {form.sous_motif_id && (
                  <div className="mt-4 flex items-center gap-3 text-[11px] font-bold text-orange-700 bg-orange-50 px-4 py-3 rounded-lg border border-orange-100 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin-slow opacity-50" />
                    Calcul automatique du délai activé selon le sous-motif sélectionné.
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-indigo-800 tracking-widest mb-2 block flex items-center gap-2">
                  <span className="bg-indigo-100 p-1 rounded"><FileText className="w-3 h-3 text-indigo-600" /></span>
                  Description détaillée / Commentaire *
                </label>
                <textarea
                  required
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="form-input min-h-[140px] resize-y border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 bg-indigo-50/10 placeholder-slate-400 leading-relaxed shadow-inner"
                  placeholder="Décrivez clairement le problème soulevé par le client... (Cette information est cruciale pour le traitement de la réclamation)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DOCUMENTS JOINTS */}
        <div className="card shadow-sm border-slate-200">
          <div className="card-header bg-slate-50/50">
            <h2 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-cnps-800" />
              PIÈCES JOINTES (OPTIONNEL)
            </h2>
          </div>
          <div className="card-body">
            <input 
              type="file" 
              multiple 
              onChange={e => setSelectedFiles(Array.from(e.target.files))}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-cnps-50 file:text-cnps-800 hover:file:bg-cnps-100 cursor-pointer"
            />
            <p className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
              Photos, scans de courriers, preuves de paiement, etc.
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <ul className="space-y-2">
                  {selectedFiles.map((f, i) => (
                    <li key={i} className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-slate-400" /> 
                        <span className="truncate max-w-[200px]">{f.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{(f.size/1024).toFixed(1)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
              : <><Save className="w-4 h-4" /> Créer et Imputer automatiquement</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
