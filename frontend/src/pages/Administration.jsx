import React, { useState, useEffect, useRef } from 'react'
import {
  Settings, Users, Building2, List, Plus,
  Loader2, ChevronRight, ChevronLeft, Tag, ShieldCheck, MapPin, X, Save, Edit2, AlertCircle, FileUp, CheckCircle2, Download, Search, UserPlus, Trash2, User, Key, Lock, History, Mail
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { authApi, parametrageApi, knowledgeBaseApi, mailApi } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlert } from '../context/AlertContext.jsx'

const TABS = [
  { id: 'utilisateurs', label: 'Utilisateurs',      icon: Users, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'agences',      label: 'Agences',           icon: Building2, roles: ['administrateur'] },
  { id: 'processus',    label: 'Processus',         icon: List, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'motifs',       label: 'Motifs & Échéances', icon: Tag, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'causes',       label: 'Causes (Analyse)',  icon: AlertCircle, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'modes_saisine', label: 'Modes de Saisine', icon: Settings, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'regimes',      label: 'Régimes & Clients', icon: ShieldCheck, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'affectations', label: 'Affectations Auto', icon: MapPin, roles: ['superviseur', 'coordonnateur', 'administrateur'] },
  { id: 'ressources',   label: 'Personnel',          icon: UserPlus, roles: ['administrateur'] },
  { id: 'travailleurs', label: 'Travailleurs',  icon: Users, roles: ['superviseur', 'administrateur'] },
  { id: 'employeurs',   label: 'Employeurs',    icon: Building2, roles: ['superviseur', 'administrateur'] },
  { id: 'sinistres',    label: 'Sinistres',     icon: AlertCircle, roles: ['superviseur', 'administrateur'] },
    { id: 'interims',     label: 'Gestion Intérims',   icon: ShieldCheck, roles: ['administrateur'] },
  { id: 'audit',        label: 'Audit & Logs',      icon: History, roles: ['administrateur'] },
  { id: 'notifications', label: 'Notifications Email', icon: Mail, roles: ['administrateur'] },
  { id: 'profil',       label: 'Mon Profil',        icon: User, roles: ['agent', 'pilote', 'superviseur', 'coordonnateur', 'administrateur'] },
]

const ROLE_LABELS = {
  agent:         'Agent',
  pilote:        'Pilote',
  coordonnateur: 'Manager de service/section accueil réclamations',
  superviseur:   'Superviseur',
  administrateur: 'Administrateur',
}
const ROLE_COLORS = {
  agent:         'bg-slate-100 text-slate-700',
  pilote:        'bg-blue-100 text-blue-700',
  coordonnateur: 'bg-indigo-100 text-indigo-700',
  superviseur:   'bg-purple-100 text-purple-700',
  administrateur: 'bg-cnps-800 text-white',
}

const AUDIT_ACTION_COLORS = {
  creation: 'bg-green-100 text-green-700',
  validation: 'bg-blue-100 text-blue-700',
  login_success: 'bg-teal-100 text-teal-700',
  login_failed: 'bg-red-100 text-red-700',
  action_ajoutee: 'bg-indigo-100 text-indigo-700',
  prise_en_charge: 'bg-amber-100 text-amber-700',
  retour_pilote: 'bg-orange-100 text-orange-700',
}

export default function Administration() {
  const { user, hasRole, isAdmin: checkAdmin, currentAgenceId } = useAuth()
  const isAdmin = checkAdmin()
  const canManage = isAdmin
  const canDeleteUsers = isAdmin
  const swal = useAlert()
  const fileInputRef = useRef(null)

  const initialTab = hasRole(['superviseur', 'coordonnateur', 'administrateur']) ? 'processus' : 'profil'
  const [tab, setTab] = useState(initialTab)

  const [data, setData] = useState([]) 
  const [regimesData, setRegimesData] = useState({ regimes: [], types: [] }) 
  const [causesData, setCausesData]   = useState({ categories: [], causes: [] })

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(user?.role))

  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' })
  const [changingPwd, setChangingPwd] = useState(false)
  const [formInterim, setFormInterim] = useState({ user_id: '', agence_id: '', date_debut: '', date_fin: '' })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwdForm.new !== pwdForm.confirm) {
      return swal.error("Erreur", "Les nouveaux mots de passe ne correspondent pas.")
    }
    setChangingPwd(true)
    try {
      await authApi.changePassword({
        current_password: pwdForm.current,
        new_password: pwdForm.new
      })
      swal.success("Succès", "Votre mot de passe a été mis à jour.")
      setPwdForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      swal.error("Erreur", err.message)
    } finally {
      setChangingPwd(false)
    }
  }
  
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const [modalTarget, setModalTarget] = useState(null)

  const [agencesList, setAgencesList] = useState([])
  const [processusList, setProcessusList] = useState([])
  const [regimesList, setRegimesList]     = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [ressourcesList, setRessourcesList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [interimRoleFilter, setInterimRoleFilter] = useState('')
  const [motifsList, setMotifsList] = useState([])
  const [causesList, setCausesList] = useState([])

  const [formProcessus, setFormProcessus] = useState({ libelle: '', code: '' })
  const [formAgence, setFormAgence]       = useState({ nom: '', code: '', type: 'agence' })
  const [formMotif, setFormMotif]         = useState({ regime_id: '', type_client_id: '', libelle: '' })
  const [formSousMotif, setFormSousMotif] = useState({ motif_id: '', libelle: '', delai_traitement_jours: 5 })
  const [formRegime, setFormRegime]       = useState({ libelle: '', has_employeur: true })
  const [formTypeClient, setFormTypeClient] = useState({ regime_id: '', libelle: '' })
  const [formCategoryCause, setFormCategoryCause] = useState({ processus_id: '', libelle: '' })
  const [formCause, setFormCause] = useState({ categorie_id: '', libelle: '', actif: true })
  const [formRessource, setFormRessource] = useState({ matricule: '', nom: '', prenoms: '', agence_id: '', actif: true, linked_user_id: null })
  const [formUser, setFormUser] = useState({ email: '', password: '', role: 'agent', ressource_id: '', nom: '', prenoms: '', matricule: '', agence_id: '', actif: true })
  const [formAffectation, setFormAffectation] = useState({ agence_id: '', processus_id: '', pilote_id: '' })
  const [formModeSaisine, setFormModeSaisine] = useState({ libelle: '' })
  const [formSuggestion, setFormSuggestion]   = useState({ motif_id: '', cause_id: '', titre: '', contenu: '', actif: true })
  const [formMail, setFormMail] = useState({ host: '', port: 587, username: '', password: '', encryption: 'tls', from_email: '', from_name: '', is_active: true })
  const [formTravailleur, setFormTravailleur] = useState({ numero_cnps: '', nom: '', prenoms: '', telephone: '', email: '' })
  const [formEmployeur, setFormEmployeur] = useState({ numero_cnps: '', raison_sociale: '', nom_employeur: '', telephone: '', email: '' })
  const [formSinistre, setFormSinistre] = useState({ numero_sinistre: '', nom: '', prenoms: '', telephone: '', email: '' })
  const [testingMail, setTestingMail] = useState(false)
  const [suggestionsList, setSuggestionsList] = useState([])
  const [pilotesList, setPilotesList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { setCurrentPage(1); setSearchTerm('') }, [tab])
  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const getFilteredData = (list) => {
    if (!list || !Array.isArray(list)) return []
    if (!searchTerm.trim()) return list
    const s = searchTerm.toLowerCase().trim()
    return list.filter(item => 
      Object.values(item).some(val => 
        val && typeof val !== 'object' && val.toString().toLowerCase().includes(s)
      )
    )
  }

  const filteredData = getFilteredData(data)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const fetchTab = async () => {
    if (tab === 'profil') return
    setLoading(true)
    setData([]) 
    try {
      if (tab === 'regimes') {
        const [r, t] = await Promise.all([parametrageApi.regimes(), parametrageApi.typesClients()])
        setRegimesData({ regimes: r?.data || [], types: t?.data || [] })
        setRegimesList(r?.data || [])
      } 
      else if (tab === 'causes') {
        const [c, k, p] = await Promise.all([
          parametrageApi.categoriesCauses(),
          parametrageApi.causes(),
          parametrageApi.processus()
        ])
        setCausesData({ categories: c?.data || [], causes: k?.data || [] })
        setCategoriesList(c?.data || [])
        setProcessusList(p?.data || [])
      }
      else {
        let res
        switch (tab) {
          case 'processus':    res = await parametrageApi.processus(); break
          case 'motifs':       res = await parametrageApi.motifs(); break
          case 'affectations': res = await parametrageApi.affectations(); break
          case 'agences':      res = await parametrageApi.agences(); break
          case 'ressources':   res = await parametrageApi.ressources(); break
          case 'utilisateurs': res = await parametrageApi.utilisateurs(); break
          case 'modes_saisine': res = await parametrageApi.modesSaisine(); break
          case 'interims':     res = await parametrageApi.interims(); break
          case 'suggestions':  res = await knowledgeBaseApi.list(); break
          case 'audit':        res = await parametrageApi.audit(); break
          case 'travailleurs': res = await parametrageApi.travailleurs(); break
          case 'employeurs':   res = await parametrageApi.employeurs(); break
          case 'sinistres':    res = await parametrageApi.sinistres(); break
        }

        let fetchedData = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        
        if (!isAdmin && (tab === 'utilisateurs' || tab === 'affectations')) {
          fetchedData = fetchedData.filter(item => item.agence_id == currentAgenceId)
        }
        
        setData(fetchedData)

        if (tab === 'suggestions') {
          const [m, c] = await Promise.all([parametrageApi.motifs(), parametrageApi.causes()])
          setData(fetchedData)
          setMotifsList(m?.data || [])
          setCausesList(c?.data || [])
        }

        if (tab === 'ressources') {
          const a = await parametrageApi.agences()
          setAgencesList(a?.data || [])
        }
        if (tab === 'utilisateurs') {
          const [a, r] = await Promise.all([parametrageApi.agences(), parametrageApi.ressources()])
          setAgencesList(a?.data || [])
          setRessourcesList(r?.data || [])
        }
        if (tab === 'affectations') {
          const [a, p, u] = await Promise.all([parametrageApi.agences(), parametrageApi.processus(), parametrageApi.utilisateurs()])
          setAgencesList(a?.data || [])
          setProcessusList(p?.data || [])
          setPilotesList((u?.data || []).filter(user => user.role === 'pilote' && user.actif))
        }
        if (tab === 'motifs') {
          const [r, tc] = await Promise.all([parametrageApi.regimes(), parametrageApi.typesClients()])
          setRegimesData({ regimes: r?.data || [], types: tc?.data || [] })
          setRegimesList(r?.data || [])
        }
        if (tab === 'interims') {
          const [u, a] = await Promise.all([parametrageApi.utilisateurs(), parametrageApi.agences()])
          setUsersList(u?.data || [])
          setAgencesList(a?.data || [])
        }
        if (tab === 'notifications') {
          const res = await mailApi.get()
          if (res?.data) setFormMail(res.data)
        }
      }
    } catch (e) { 
      console.error(e)
      swal.error("Erreur de chargement", "Impossible de récupérer les données pour l'onglet " + tab)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchTab() }, [tab])

  const handleOpenCreate = (target = tab) => {
    setEditMode(false); setCurrentId(null); setModalTarget(target === 'regimes' ? 'regime' : target === 'causes' ? 'cause' : target)
    setFormProcessus({ libelle: '', code: '' })
    setFormAgence({ nom: '', code: '', type: 'agence' })
    setFormMotif({ regime_id: '', type_client_id: '', libelle: '' })
    setFormRegime({ libelle: '', has_employeur: true })
    setFormTypeClient({ regime_id: '', libelle: '' })
    setFormCategoryCause({ processus_id: '', libelle: '' })
    setFormCause({ categorie_id: '', libelle: '', actif: true })
    setFormRessource({ matricule: '', nom: '', prenoms: '', agence_id: '', actif: true, linked_user_id: null })
    setFormUser({ email: '', password: '', role: 'agent', ressource_id: '', nom: '', prenoms: '', matricule: '', agence_id: '', actif: true })
    setFormAffectation({ agence_id: '', processus_id: '', pilote_id: '' })
    setFormModeSaisine({ libelle: '' })
    setFormSousMotif({ motif_id: '', libelle: '', delai_traitement_jours: 5 })
    setFormSuggestion({ motif_id: '', cause_id: '', titre: '', contenu: '', actif: true })
    setFormTravailleur({ numero_cnps: '', nom: '', prenoms: '', telephone: '', email: '' })
    setFormEmployeur({ numero_cnps: '', raison_sociale: '', nom_employeur: '', telephone: '', email: '' })
    setFormSinistre({ numero_sinistre: '', nom: '', prenoms: '', telephone: '', email: '' })
    if (target === 'interims' || tab === 'interims') {
      parametrageApi.utilisateurs({ role: 'superviseur,coordonnateur' }).then(u => setUsersList(u?.data || []))
      parametrageApi.agences().then(a => setAgencesList(a?.data || []))
    }
    if (target === 'affectations' || tab === 'affectations') {
      parametrageApi.agences().then(a => setAgencesList(a?.data || []))
      parametrageApi.processus().then(p => setProcessusList(p?.data || []))
      parametrageApi.utilisateurs().then(u => setPilotesList((u?.data || []).filter(user => user.role === 'pilote' && user.actif)))
    }
    setFormInterim({ user_id: '', agence_id: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '' })
    setShowModal(true)
  }

  const handleOpenEdit = (target, item) => {
    setEditMode(true); setCurrentId(item.id); setModalTarget(target)
    if (target === 'processus') setFormProcessus({ libelle: item.libelle, code: item.code })
    if (target === 'agences') setFormAgence({ nom: item.nom, code: item.code, type: item.type })

    if (target === 'regime') setFormRegime({ libelle: item.libelle, has_employeur: item.has_employeur ?? true })
    if (target === 'type_client') setFormTypeClient({ regime_id: item.regime_id, libelle: item.libelle })
    if (target === 'motifs') setFormMotif({ regime_id: item.regime_id, type_client_id: item.type_client_id || '', libelle: item.libelle })
    if (target === 'category_cause') setFormCategoryCause({ processus_id: item.processus_id, libelle: item.libelle })
    if (target === 'cause') setFormCause({ categorie_id: item.categorie_id, libelle: item.libelle, actif: item.actif })
    if (target === 'ressources') setFormRessource({ matricule: item.matricule, nom: item.nom, prenoms: item.prenoms, agence_id: item.agence_id, actif: item.actif, linked_user_id: item.linked_user_id })
    if (target === 'utilisateurs') setFormUser({ email: item.email, password: '', role: item.role, ressource_id: item.ressource_id || '', nom: item.nom, prenoms: item.prenoms, matricule: item.matricule, agence_id: item.agence_id, actif: item.actif })
    if (target === 'affectations') setFormAffectation({ agence_id: item.agence_id, processus_id: item.processus_id, pilote_id: item.pilote_id })
    if (target === 'modes_saisine') setFormModeSaisine({ libelle: item.libelle })
    if (target === 'sous_motifs') setFormSousMotif({ motif_id: item.motif_id, libelle: item.libelle, delai_traitement_jours: item.delai_traitement_jours })
    if (target === 'suggestions') setFormSuggestion({ motif_id: item.motif_id || '', cause_id: item.cause_id || '', titre: item.titre, contenu: item.contenu, actif: item.actif })
    if (target === 'travailleurs') setFormTravailleur({ numero_cnps: item.numero_cnps, nom: item.nom, prenoms: item.prenoms, telephone: item.telephone || '', email: item.email || '' })
    if (target === 'employeurs') setFormEmployeur({ numero_cnps: item.numero_cnps, raison_sociale: item.raison_sociale, nom_employeur: item.nom_employeur || '', telephone: item.telephone || '', email: item.email || '' })
    if (target === 'sinistres') setFormSinistre({ numero_sinistre: item.numero_sinistre, nom: item.nom, prenoms: item.prenoms, telephone: item.telephone || '', email: item.email || '' })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (modalTarget === 'processus') editMode ? await parametrageApi.updateProcessus(currentId, formProcessus) : await parametrageApi.saveProcessus(formProcessus)
      else if (modalTarget === 'agences') editMode ? await parametrageApi.updateAgence(currentId, formAgence) : await parametrageApi.saveAgence(formAgence)
      else if (modalTarget === 'motifs') editMode ? await parametrageApi.updateMotif(currentId, formMotif) : await parametrageApi.saveMotif(formMotif)
      else if (modalTarget === 'regime') editMode ? await parametrageApi.updateRegime(currentId, formRegime) : await parametrageApi.saveRegime(formRegime)
      else if (modalTarget === 'type_client') editMode ? await parametrageApi.updateTypeClient(currentId, formTypeClient) : await parametrageApi.saveTypeClient(formTypeClient)
      else if (modalTarget === 'category_cause') editMode ? await parametrageApi.updateCategoryCause(currentId, formCategoryCause) : await parametrageApi.saveCategoryCause(formCategoryCause)
      else if (modalTarget === 'cause') editMode ? await parametrageApi.updateCause(currentId, formCause) : await parametrageApi.saveCause(formCause)
      else if (modalTarget === 'ressources') {
        if (editMode && formRessource.linked_user_id && !formRessource.actif) {
          const ok = await swal.confirm(
            "Sécurité de compte",
            "Attention : Cette ressource est liée à un compte utilisateur. Désactiver cette ressource désactivera également son accès au système. Confirmer ?"
          )
          if (!ok) { setSaving(false); return }
        }
        editMode ? await parametrageApi.updateRessource(currentId, formRessource) : await parametrageApi.saveRessource(formRessource)
      }
      else if (modalTarget === 'utilisateurs') editMode ? await parametrageApi.updateUtilisateur(currentId, formUser) : await parametrageApi.saveUtilisateur(formUser)
      else if (modalTarget === 'affectations') await parametrageApi.saveAffectation(formAffectation)
      else if (modalTarget === 'modes_saisine') editMode ? await parametrageApi.updateModeSaisine(currentId, formModeSaisine) : await parametrageApi.saveModeSaisine(formModeSaisine)
      else if (modalTarget === 'sous_motifs') editMode ? await parametrageApi.updateSousMotif(currentId, formSousMotif) : await parametrageApi.saveSousMotif(formSousMotif)
      else if (modalTarget === 'suggestions') editMode ? await knowledgeBaseApi.update(currentId, formSuggestion) : await knowledgeBaseApi.save(formSuggestion)
      else if (modalTarget === 'interims') await parametrageApi.saveInterim(formInterim)
      else if (modalTarget === 'travailleurs') editMode ? await parametrageApi.updateTravailleur(currentId, formTravailleur) : await parametrageApi.saveTravailleur(formTravailleur)
      else if (modalTarget === 'employeurs') {
        const payload = { ...formEmployeur };
        if (!payload.nom_employeur || !payload.nom_employeur.trim()) {
          payload.nom_employeur = payload.raison_sociale;
        }
        editMode ? await parametrageApi.updateEmployeur(currentId, payload) : await parametrageApi.saveEmployeur(payload)
      }
      else if (modalTarget === 'sinistres') editMode ? await parametrageApi.updateSinistre(currentId, formSinistre) : await parametrageApi.saveSinistre(formSinistre)
      
      setShowModal(false)
      setCurrentPage(1)
      fetchTab()
      swal.success("Succès", "L'opération a été effectuée avec succès.")
    } catch (err) { 
      swal.error("Erreur", err.message || "Une erreur est survenue lors de l'enregistrement.") 
    } finally { 
      setSaving(false) 
    }
  }
  const handleTestMail = async (e) => {
    e.preventDefault()
    setTestingMail(true)
    try {
      const res = await mailApi.test(formMail)
      swal.success("Succès", res.message)
    } catch (err) {
      swal.error("Échec du test", err.message)
    } finally {
      setTestingMail(false)
    }
  }

  const handleSaveMail = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await mailApi.save(formMail)
      swal.success("Succès", "La configuration du serveur de messagerie a été enregistrée.")
    } catch (err) {
      swal.error("Erreur", err.message || "Impossible d'enregistrer la configuration.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (target, item) => {
    const ok = await swal.confirm(
      "Confirmation de suppression",
      `Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.`
    )
    if (!ok) return

    try {
      setLoading(true)
      const targetEntity = target === 'regime' ? 'regimes' : 
                           target === 'type_client' ? 'types_clients' : 
                           target === 'category_cause' ? 'categories_causes' :
                           target === 'cause' ? 'causes' : 
                           target === 'modes_saisine' ? 'modes-saisine' : 
                           target === 'sous_motifs' ? 'sous-motifs' : target;
      await parametrageApi.deleteEntity(targetEntity, item.id)
      swal.success("Succès", "L'élément a été supprimé avec succès.")
      fetchTab()
    } catch (err) {
      swal.error("Erreur", err.message || "Impossible de supprimer cet élément.")
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    let confirmMsg = "";
    let successMsg = "";
    let clearFunc = null;

    if (tab === 'employeurs') {
      confirmMsg = "Êtes-vous sûr de vouloir supprimer tous les employeurs en une seule fois ? Cette action est irréversible.";
      successMsg = "Tous les employeurs ont été supprimés avec succès.";
      clearFunc = parametrageApi.clearEmployeurs;
    } else if (tab === 'travailleurs') {
      confirmMsg = "Êtes-vous sûr de vouloir supprimer tous les travailleurs en une seule fois ? Cette action est irréversible.";
      successMsg = "Tous les travailleurs ont été supprimés avec succès.";
      clearFunc = parametrageApi.clearTravailleurs;
    } else if (tab === 'sinistres') {
      confirmMsg = "Êtes-vous sûr de vouloir supprimer tous les sinistres en une seule fois ? Cette action est irréversible.";
      successMsg = "Tous les sinistres ont été supprimés avec succès.";
      clearFunc = parametrageApi.clearSinistres;
    } else if (tab === 'ressources') {
      confirmMsg = "Êtes-vous sûr de vouloir supprimer tous les membres du personnel qui n'ont pas de compte utilisateur ? Cette action est irréversible.";
      successMsg = "Les membres du personnel sans compte ont été supprimés avec succès.";
      clearFunc = parametrageApi.clearRessourcesNoAccount;
    }

    if (!clearFunc) return;

    const ok = await swal.confirm("Confirmation de vidage", confirmMsg);
    if (!ok) return;

    try {
      setLoading(true);
      const res = await clearFunc();
      swal.success("Succès", res.message || successMsg);
      fetchTab();
    } catch (err) {
      swal.error("Erreur", err.message || "Une erreur est survenue lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };
  const onSelectRessource = (resId) => {
    const res = ressourcesList.find(r => r.id === parseInt(resId))
    if (!res) return
    setFormUser({
      ...formUser,
      ressource_id: res.id,
      nom: res.nom,
      prenoms: res.prenoms,
      matricule: res.matricule,
      agence_id: res.agence_id,
      email: res.email || formUser.email
    })
  }

  const getModalTitle = () => {
    const action = editMode ? 'MODIFIER' : 'AJOUTER'
    const entities = { 
      processus: 'UN PROCESSUS', 
      motifs: 'UN MOTIF', 
      sous_motifs: 'UN SOUS-MOTIF', 
      agences: 'UNE AGENCE', 
      regime: 'UN RÉGIME', 
      type_client: 'UN TYPE DE CLIENT', 
      category_cause: 'UNE CATÉGORIE DE CAUSE', 
      cause: 'UNE CAUSE', 
      ressources: 'UNE RESSOURCE (PERSONNEL)', 
      utilisateurs: 'UN UTILISATEUR', 
      modes_saisine: 'UN MODE DE SAISINE',
      interims: 'UN INTÉRIM',
      suggestions: 'UNE SUGGESTION DE RÉPONSE',
      travailleurs: 'UN TRAVAILLEUR',
      employeurs: 'UN EMPLOYEUR',
      sinistres: 'UN SINISTRE'
    }
    return `${action} ${entities[modalTarget] || 'L\'ÉLÉMENT'}`
  }

  const downloadTemplate = () => {
    let ws_data = [];
    let name = "modele";
    if (tab === 'causes') {
      ws_data = [["CODE_PROCESSUS", "CATEGORIE", "CAUSE"], ["GDATMP", "Cause Client", "Non dépôt de pièces de maintien de droit"], ["GDATMP", "Cause CNPS", "Défaut de communication"]]
      name = "modele_import_causes";
    } else if (tab === 'ressources') {
      ws_data = [["MATRICULE", "NOM", "PRENOMS", "CODE_AGENCE"], ["M3057", "Ahipo", "Jean-Roger", "DSI"], ["MAT-AGY-001", "AKA", "Bénédicte", "AGY"]]
      name = "modele_import_ressources";
    } else if (tab === 'motifs') {
      ws_data = [["REGIME", "TYPE_CLIENT", "MOTIF", "SOUS_MOTIF", "DELAI_TRAITEMENT"], ["REGIME DES PENSIONS", "Pensionné", "Retard de paiement", "Dossier incomplet", 5]]
      name = "modele_import_motifs";
    } else if (tab === 'travailleurs') {
      ws_data = [["NUMERO_CNPS", "NOM", "PRENOMS", "TELEPHONE", "EMAIL"], ["123456789", "TRAORE", "Moussa", "0102030405", "moussa@example.com"]]
      name = "modele_import_travailleurs";
    } else if (tab === 'employeurs') {
      ws_data = [["NUMERO_CNPS", "RAISON_SOCIALE", "NOM_EMPLOYEUR", "TELEPHONE", "EMAIL"], ["E999888", "ENTREPRISE ABC", "Koffi Paul", "0506070809", "abc@example.com"]]
      name = "modele_import_employeurs";
    } else if (tab === 'sinistres') {
      ws_data = [["NUMERO_SINISTRE", "NOM", "PRENOMS", "TELEPHONE", "EMAIL"], ["S100200", "DIAKITE", "Fatoumata", "0708091011", "fatou@example.com"]]
      name = "modele_import_sinistres";
    }
    const ws = XLSX.utils.aoa_to_sheet(ws_data); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Modele"); XLSX.writeFile(wb, `${name}.xlsx`)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result; const wb = XLSX.read(bstr, { type: 'binary' })
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" })
        
        const getValue = (row, keys, index = -1, defaultValue = '') => {
          if (!row || typeof row !== 'object') return defaultValue;
          
          const normalize = (str) => 
            String(str)
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "");

          const normalizedKeys = keys.map(k => normalize(k));

          // 1. Try to find by normalized key matching
          for (const [key, val] of Object.entries(row)) {
            if (normalizedKeys.includes(normalize(key))) {
              return val !== undefined && val !== null ? String(val).trim() : defaultValue;
            }
          }

          // 2. Fallback to index if valid
          if (index >= 0) {
            const values = Object.values(row);
            if (index < values.length) {
              const val = values[index];
              return val !== undefined && val !== null ? String(val).trim() : defaultValue;
            }
          }

          return defaultValue;
        };

        let mappedData = [];
        let res;

        if (tab === 'causes') {
          mappedData = data.map(row => ({
            processus: getValue(row, ['CODE_PROCESSUS', 'PROCESSUS'], 0),
            categorie: getValue(row, ['CATEGORIE', 'CATEGORIES'], 1),
            cause: getValue(row, ['CAUSE', 'CAUSES'], 2)
          }))
          res = await parametrageApi.bulkCauses(mappedData)
        } else if (tab === 'ressources') {
          mappedData = data.map(row => ({
            matricule: getValue(row, ['MATRICULE'], 0),
            nom: getValue(row, ['NOM'], 1),
            prenoms: getValue(row, ['PRENOMS', 'PRENOM'], 2),
            code_agence: getValue(row, ['CODE_AGENCE', 'AGENCE'], 3)
          }))
          res = await parametrageApi.bulkRessources(mappedData)
        } else if (tab === 'motifs') {
          mappedData = data.map(row => ({
            regime: getValue(row, ['REGIME'], 0),
            type_client: getValue(row, ['TYPE_CLIENT', 'TYPE CLIENT'], 1),
            libelle: getValue(row, ['MOTIF', 'LIBELLE'], 2),
            sous_motif: getValue(row, ['SOUS_MOTIF', 'SOUS MOTIF'], 3),
            delai: getValue(row, ['DELAI_TRAITEMENT', 'DELAI'], 4)
          }))
          res = await parametrageApi.bulkMotifs(mappedData)
        } else if (tab === 'travailleurs') {
          mappedData = data.map(row => ({
            numero_cnps: getValue(row, ['NUMERO_CNPS', 'CNPS'], 0),
            nom: getValue(row, ['NOM'], 1),
            prenoms: getValue(row, ['PRENOMS', 'PRENOM'], 2),
            telephone: getValue(row, ['TELEPHONE', 'TEL', 'PHONE'], 3),
            email: getValue(row, ['EMAIL', 'E_MAIL', 'MAIL'], 4)
          }))
          res = await parametrageApi.importTravailleurs(mappedData)
        } else if (tab === 'employeurs') {
          mappedData = data.map(row => {
            const numero_cnps = getValue(row, ['NUMERO_CNPS', 'CNPS'], 0);
            const raison_sociale = getValue(row, ['RAISON_SOCIALE', 'RAISON SOCIALE'], 1);
            let nom_employeur = getValue(row, ['NOM_EMPLOYEUR', 'NOM EMPLOYEUR'], 2);
            if (!nom_employeur) {
              nom_employeur = raison_sociale;
            }
            const telephone = getValue(row, ['TELEPHONE', 'TEL', 'PHONE'], 3);
            const email = getValue(row, ['EMAIL', 'E_MAIL', 'MAIL'], 4);
            return { numero_cnps, raison_sociale, nom_employeur, telephone, email };
          })
          res = await parametrageApi.importEmployeurs(mappedData)
        } else if (tab === 'sinistres') {
          mappedData = data.map(row => ({
            numero_sinistre: getValue(row, ['NUMERO_SINISTRE', 'NUMERO SINISTRE', 'SINISTRE'], 0),
            nom: getValue(row, ['NOM'], 1),
            prenoms: getValue(row, ['PRENOMS', 'PRENOM'], 2),
            telephone: getValue(row, ['TELEPHONE', 'TEL', 'PHONE'], 3),
            email: getValue(row, ['EMAIL', 'E_MAIL', 'MAIL'], 4)
          }))
          res = await parametrageApi.importSinistres(mappedData)
        }

        swal.success("Importation réussie", res.message || "Les données ont été intégrées avec succès."); fetchTab()
      } catch (err) { swal.error("Échec de l'import", err.message) } finally { setImporting(false); e.target.value = '' }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div className="relative animate-in fade-in duration-500">
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cnps-100 rounded-lg"><Settings className="w-6 h-6 text-cnps-800" /></div>
          <div><h1 className="page-title text-2xl">Administration</h1><p className="text-sm text-slate-500 font-medium">Configuration du Workflow et Paramètres Métiers</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${tab === id ? 'bg-cnps-800 text-white shadow-md scale-[1.02]' : 'text-slate-600 hover:text-cnps-800 hover:bg-white hover:shadow-sm'}`}><Icon className={`w-4 h-4 ${tab === id ? 'text-white' : 'text-slate-400'}`} />{label}</button>
        ))}
      </div>

      <div className="card shadow-xl border-slate-200 overflow-hidden rounded-2xl bg-white">
        <div className="card-header border-b border-slate-100 flex justify-between items-center bg-slate-50/50 px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-cnps-800 rounded-full"></div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gestion des {TABS.find(t => t.id === tab)?.label}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tab === 'regimes' ? (regimesData.regimes.length + regimesData.types.length) : tab === 'causes' ? (causesData.categories.length + causesData.causes.length) : (Array.isArray(data) ? data.length : 0)} enregistrement(s) trouvé(s)</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (tab === 'causes' || tab === 'ressources' || tab === 'motifs' || tab === 'travailleurs' || tab === 'employeurs' || tab === 'sinistres') && (
              <><button onClick={downloadTemplate} className="btn-secondary !py-3 !px-4 !text-[10px] font-black shadow-sm flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-100"><Download className="w-3.5 h-3.5" /> MODÈLE EXCEL</button><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" /><button onClick={handleImportClick} disabled={importing} className="btn-secondary !py-3 !px-4 !text-[10px] font-black shadow-sm flex items-center gap-2 border-cnps-200 text-cnps-800 hover:bg-cnps-50">{importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} IMPORTER EXCEL</button></>
            )}
            {canManage && (tab === 'ressources' || tab === 'travailleurs' || tab === 'employeurs' || tab === 'sinistres') && (
              <button onClick={handleClearAll} className="btn-secondary !py-3 !px-4 !text-[10px] font-black shadow-sm flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                {tab === 'ressources' ? 'VIDER SANS COMPTE' : 'VIDER TOUT'}
              </button>
            )}
            {canManage && (tab === 'processus' || tab === 'agences' || tab === 'ressources' || tab === 'utilisateurs' || tab === 'affectations' || tab === 'modes_saisine' || tab === 'interims' || tab === 'suggestions' || tab === 'travailleurs' || tab === 'employeurs' || tab === 'sinistres') && (
              <button onClick={() => handleOpenCreate()} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2">
                <Plus className="w-4 h-4 stroke-[3]" />
                AJOUTER {
                  tab === 'processus' ? 'PROCESSUS' : 
                  tab === 'agences' ? 'AGENCE' : 
                  tab === 'ressources' ? 'RESSOURCE' : 
                  tab === 'affectations' ? 'AFFECTATION' : 
                  tab === 'modes_saisine' ? 'MODE DE SAISINE' : 
                  tab === 'interims' ? 'INTÉRIM' : 
                  tab === 'suggestions' ? 'SUGGESTION' : 
                  tab === 'travailleurs' ? 'TRAVAILLEUR' :
                  tab === 'employeurs' ? 'EMPLOYEUR' :
                  tab === 'sinistres' ? 'SINISTRE' :
                  'UTILISATEUR'
                }
              </button>
            )}
            {canManage && tab === 'motifs' && (
              <div className="flex gap-2">
                <button onClick={() => handleOpenCreate('motifs')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> MOTIF</button>
                <button onClick={() => handleOpenCreate('sous_motifs')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4" /> SOUS-MOTIF</button>
              </div>
            )}
            {canManage && tab === 'regimes' && (
              <div className="flex gap-2">
                <button onClick={() => handleOpenCreate('regime')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> RÉGIME</button>
                <button onClick={() => handleOpenCreate('type_client')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4" /> TYPE CLIENT</button>
              </div>
            )}
            {canManage && tab === 'causes' && (
              <div className="flex gap-2">
                <button onClick={() => handleOpenCreate('category_cause')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> CATÉGORIE</button>
                <button onClick={() => handleOpenCreate('cause')} className="btn-primary !py-3 !px-6 !text-xs font-black shadow-lg flex items-center gap-2 bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4" /> CAUSE</button>
              </div>
            )}
          </div>
        </div>

        {tab === 'profil' ? (
          <div className="p-8 bg-slate-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-cnps-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
                    <User className="w-12 h-12 text-cnps-800" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase">{user?.prenoms} {user?.nom}</h3>
                  <span className={`badge mt-2 ${ROLE_COLORS[user?.role]}`}>{ROLE_LABELS[user?.role]}</span>
                  
                  <div className="w-full mt-8 space-y-3 text-left">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matricule</span>
                      <span className="font-mono font-bold text-slate-700">{user?.matricule}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email / Identifiant</span>
                      <span className="font-bold text-slate-700">{user?.email}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agence d'affectation</span>
                      <span className="font-bold text-slate-700">{user?.agence_nom} ({user?.agence_code})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <Key className="w-5 h-5 text-cnps-800" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Sécurité & Mot de passe</h2>
                  </div>
                  <div className="p-8">
                    <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Mot de passe actuel</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                              type="password" 
                              required 
                              className="form-input pl-10" 
                              value={pwdForm.current}
                              onChange={e => setPwdForm({...pwdForm, current: e.target.value})}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-50">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nouveau mot de passe</label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                              type="password" 
                              required 
                              className="form-input pl-10" 
                              value={pwdForm.new}
                              onChange={e => setPwdForm({...pwdForm, new: e.target.value})}
                              placeholder="Minimum 6 caractères"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Confirmer le nouveau mot de passe</label>
                          <div className="relative">
                            <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                              type="password" 
                              required 
                              className="form-input pl-10" 
                              value={pwdForm.confirm}
                              onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit" 
                          disabled={changingPwd}
                          className="btn-primary w-full !py-4 !rounded-xl shadow-lg shadow-cnps-800/20 flex items-center justify-center gap-3"
                        >
                          {changingPwd ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          Mettre à jour le mot de passe
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Recherche rapide..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-cnps-500/20 focus:border-cnps-500 outline-none transition-all shadow-sm"
                  />
                </div>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-tight">Effacer</button>
                )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="w-12 h-12 animate-spin text-cnps-800 opacity-20" /><p className="text-sm text-slate-400 font-bold tracking-widest uppercase">Synchronisation...</p></div>
            ) : (
              <div className="overflow-x-auto">
                {tab === 'processus' && Array.isArray(data) && (
                  <table className="table-cnps">
                    <thead><tr><th className="w-24">Code</th><th>Libellé</th><th className="w-32">Statut</th>{canManage && <th className="w-24 text-right">Actions</th>}</tr></thead>
                    <tbody>{paginatedData.map(p => (<tr key={p.id} className="hover:bg-slate-50/80 transition-colors group"><td><span className="font-mono text-[11px] font-black bg-slate-100 px-2 py-1 rounded text-cnps-800 border border-slate-200">{p.code}</span></td><td className="font-bold text-slate-800 py-4">{p.libelle}</td><td><span className={`badge ${p.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.actif ? 'Actif' : 'Inactif'}</span></td>{canManage && <td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('processus', p)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('processus', p)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>}</tr>))}</tbody>
                  </table>
                )}

                {tab === 'motifs' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Régime</th><th>Type de Client</th><th>Motif</th><th>Sous-motifs & Délais</th>{canManage && <th className="w-24 text-right">Actions</th>}</tr></thead>
                <tbody>{paginatedData.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 group">
                    <td><span className="font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">{m.regime_libelle || '-'}</span></td>
                    <td className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-md">{m.type_client_libelle || '-'}</td>
                    <td className="font-bold text-slate-800">{m.libelle}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {m.sous_motifs ? (
                          (typeof m.sous_motifs === 'string' ? JSON.parse(m.sous_motifs) : m.sous_motifs).map((sm, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm group/sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-cnps-400"></div>
                              {sm.libelle} <span className="text-cnps-600 ml-1">{sm.delai_traitement_jours}j</span>
                              {canManage && (
                                <div className="hidden group-hover/sm:flex items-center gap-0.5 ml-1 border-l pl-1 border-slate-100">
                                  <button onClick={() => handleOpenEdit('sous_motifs', { ...sm, motif_id: m.id })} className="p-0.5 hover:text-cnps-800 transition-colors"><Edit2 className="w-2.5 h-2.5" /></button>
                                  <button onClick={() => handleDelete('sous_motifs', sm)} className="p-0.5 hover:text-red-600 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                </div>
                              )}
                            </span>
                          ))
                        ) : <span className="text-slate-300 text-xs italic">— Aucun sous-motif —</span>}
                      </div>
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleOpenEdit('motifs', m)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('motifs', m)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            )}

            {tab === 'causes' && (
              <div className="p-8 space-y-8 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {processusList.map(proc => (
                    <div key={proc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-cnps-800 text-white font-black text-xs uppercase tracking-widest flex justify-between items-center">{proc.libelle}<span className="font-mono text-[10px] bg-white/20 px-1.5 rounded">{proc.code}</span></div>
                      <div className="p-4 space-y-4">
                        {causesData.categories.filter(c => c.processus_id === proc.id).map(cat => (
                          <div key={cat.id} className="space-y-2">
                            <div className="flex justify-between items-center px-3 py-1.5 bg-slate-100 rounded-lg"><span className="text-[10px] font-black uppercase text-slate-500">{cat.libelle}</span>{canManage && <div className="flex gap-1"><button onClick={() => handleOpenEdit('category_cause', cat)} className="p-1 text-slate-300 hover:text-cnps-800 transition-all"><Edit2 className="w-3 h-3" /></button><button onClick={() => handleDelete('category_cause', cat)} className="p-1 text-slate-300 hover:text-red-600 transition-all"><Trash2 className="w-3 h-3" /></button></div>}</div>
                            <ul className="space-y-1.5 pl-2">{causesData.causes.filter(k => k.categorie_id === cat.id).map(cause => (<li key={cause.id} className="text-xs text-slate-600 font-bold flex justify-between items-start group"><span>• {cause.libelle}</span>{canManage && <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('cause', cause)} className="p-1 text-slate-200 hover:text-cnps-800"><Edit2 className="w-3 h-3" /></button><button onClick={() => handleDelete('cause', cause)} className="p-1 text-slate-200 hover:text-red-600"><Trash2 className="w-3 h-3" /></button></div>}</li>))}</ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'regimes' && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/30">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-black text-slate-500 text-[10px] uppercase tracking-widest">Régimes</div><table className="w-full text-sm"><tbody>{regimesData.regimes.map(r => (<tr key={r.id} className="border-b border-slate-50 group hover:bg-slate-50"><td className="px-6 py-4 font-bold text-slate-800">{r.libelle}</td><td className="px-6 py-4 text-right">{canManage && <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('regime', r)} className="p-1.5 text-slate-300 hover:text-cnps-800"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete('regime', r)} className="p-1.5 text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></div>}</td></tr>))}</tbody></table></div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-black text-slate-500 text-[10px] uppercase tracking-widest">Types de Clients</div><table className="w-full text-sm"><tbody>{regimesData.types.map(t => (<tr key={t.id} className="border-b border-slate-50 group hover:bg-slate-50"><td className="px-6 py-4"><div className="font-bold text-slate-800">{t.libelle}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{regimesList.find(r => r.id === t.regime_id)?.libelle}</div></td><td className="px-6 py-4 text-right">{canManage && <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('type_client', t)} className="p-1.5 text-slate-300 hover:text-cnps-800"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete('type_client', t)} className="p-1.5 text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></div>}</td></tr>))}</tbody></table></div>
              </div>
            )}

            {tab === 'modes_saisine' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Libellé</th>{canManage && <th className="w-24 text-right">Actions</th>}</tr></thead>
                <tbody>{paginatedData.map(m => (<tr key={m.id} className="hover:bg-slate-50/80 group"><td><span className="font-bold text-slate-800">{m.libelle}</span></td>{canManage && <td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('modes_saisine', m)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('modes_saisine', m)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>}</tr>))}</tbody>
              </table>
            )}

            {tab === 'affectations' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Agence</th><th>Processus</th><th>Pilote assigné</th>{canManage && <th className="w-24 text-right">Actions</th>}</tr></thead>
                <tbody>{paginatedData.map(a => (<tr key={a.id} className="hover:bg-slate-50/80 group"><td><span className="font-bold text-slate-800">{a.agence_nom}</span></td><td className="font-bold text-cnps-800 bg-cnps-50 px-2 py-1 rounded w-fit">{a.processus_libelle}</td><td><span className="font-bold text-slate-700">{a.pilote_nom} {a.pilote_prenoms}</span></td>{canManage && <td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('affectations', a)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('affectations', a)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>}</tr>))}</tbody>
              </table>
            )}

            {tab === 'agences' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(a => (<tr key={a.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono font-black text-cnps-800 text-xs">{a.code}</span></td><td className="font-bold text-slate-800">{a.nom}</td><td><span className={`badge ${a.type === 'centrale' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{a.type === 'centrale' ? 'Direction Centrale' : 'Agence'}</span></td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('agences', a)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('agences', a)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'ressources' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Matricule</th><th>Nom & Prénoms</th><th>Agence</th><th className="w-24">Statut</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(r => (<tr key={r.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono font-black text-cnps-800 text-xs">{r.matricule}</span></td><td className="font-bold text-slate-800">{r.nom} {r.prenoms}</td><td className="text-xs font-bold text-slate-500">{r.agence_nom}</td><td><span className={`badge ${r.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{r.actif ? 'Actif' : 'Inactif'}</span></td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('ressources', r)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>{!r.linked_user_id && (<button onClick={() => handleDelete('ressources', r)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>)}</div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'utilisateurs' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Matricule</th><th>Nom complet</th><th>Email</th><th>Rôle</th><th>Agence</th><th className="w-24">Statut</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(u => (<tr key={u.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono text-[10px] text-slate-400 font-black">{u.matricule}</span></td><td className="font-black text-slate-800">{u.prenoms} {u.nom}</td><td className="text-xs text-slate-500 font-medium">{u.email}</td><td><span className={`badge ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>{ROLE_LABELS[u.role] || u.role}</span></td><td className="text-xs text-slate-600 font-black italic">{u.agence_code}</td><td><span className={`badge ${u.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{u.actif ? 'Actif' : 'Inactif'}</span></td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('utilisateurs', u)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>{canDeleteUsers && <button onClick={() => handleDelete('utilisateurs', u)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}</div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'travailleurs' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>N° CNPS</th><th>Nom & Prénoms</th><th>Téléphone</th><th>Email</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(r => (<tr key={r.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono font-black text-cnps-800 text-xs">{r.numero_cnps}</span></td><td className="font-bold text-slate-800">{r.nom} {r.prenoms}</td><td className="text-xs font-bold text-slate-500">{r.telephone || '-'}</td><td className="text-xs text-slate-500">{r.email || '-'}</td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('travailleurs', r)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('travailleurs', r)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'employeurs' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>N° CNPS</th><th>Raison Sociale</th><th>Nom Employeur</th><th>Téléphone</th><th>Email</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(r => (<tr key={r.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono font-black text-cnps-800 text-xs">{r.numero_cnps}</span></td><td className="font-bold text-slate-800">{r.raison_sociale}</td><td className="text-xs font-bold text-slate-500">{r.nom_employeur || '-'}</td><td className="text-xs text-slate-500">{r.telephone || '-'}</td><td className="text-xs text-slate-500">{r.email || '-'}</td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('employeurs', r)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('employeurs', r)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'sinistres' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>N° Sinistre</th><th>Nom & Prénoms</th><th>Téléphone</th><th>Email</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(r => (<tr key={r.id} className="hover:bg-slate-50/80 group"><td><span className="font-mono font-black text-cnps-800 text-xs">{r.numero_sinistre}</span></td><td className="font-bold text-slate-800">{r.nom} {r.prenoms}</td><td className="text-xs font-bold text-slate-500">{r.telephone || '-'}</td><td className="text-xs text-slate-500">{r.email || '-'}</td><td className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenEdit('sinistres', r)} className="p-2 text-slate-300 hover:text-cnps-800 hover:bg-cnps-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete('sinistres', r)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>))}</tbody>
              </table>
            )}

            {tab === 'interims' && Array.isArray(data) && (
              <table className="table-cnps">
                <thead><tr><th>Collaborateur</th><th>Agence d'Intérim</th><th>Période</th><th>Statut</th><th className="w-24 text-right">Actions</th></tr></thead>
                <tbody>{paginatedData.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50/80 group">
                    <td className="py-4">
                      <div className="font-bold text-slate-800">{i.user_prenoms} {i.user_nom}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase">{i.matricule}</div>
                    </td>
                    <td>
                      <div className="font-bold text-cnps-800">{i.agence_nom}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase">{i.agence_code}</div>
                    </td>
                    <td>
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                        <span>{new Date(i.date_debut).toLocaleDateString()}</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>{new Date(i.date_fin).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${i.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{i.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => parametrageApi.toggleInterim(i.id).then(() => fetchTab())} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Lock className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('interims', i)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}

            {tab !== 'analytics' && tab !== 'notifications' && tab !== 'audit' && Array.isArray(data) && filteredData.length === 0 && !loading && (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Aucune donnée trouvée</h3>
                <p className="text-slate-400 text-sm mt-2 font-medium">Réessayez avec d'autres critères ou ajoutez un nouvel élément.</p>
              </div>
            )}
            {tab === 'notifications' && (
              <div className="p-8 bg-slate-50/30">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-cnps-800" />
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Configuration du Serveur SMTP</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${formMail.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {formMail.is_active ? 'Service Actif' : 'Service Désactivé'}
                        </span>
                      </div>
                    </div>
                    
                    <form onSubmit={handleSaveMail} className="p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Serveur SMTP */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" /> Serveur de messagerie
                          </h3>
                          <div className="grid gap-4">
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Hôte SMTP *</label>
                              <input type="text" required className="form-input" value={formMail.host} onChange={e => setFormMail({...formMail, host: e.target.value})} placeholder="smtp.gmail.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Port *</label>
                                <input type="number" required className="form-input" value={formMail.port} onChange={e => setFormMail({...formMail, port: e.target.value})} placeholder="587" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Chiffrement</label>
                                <select className="form-select" value={formMail.encryption} onChange={e => setFormMail({...formMail, encryption: e.target.value})}>
                                  <option value="tls">TLS</option>
                                  <option value="ssl">SSL</option>
                                  <option value="">Aucun</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Authentification */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" /> Authentification
                          </h3>
                          <div className="grid gap-4">
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Utilisateur / Login</label>
                              <input type="text" className="form-input" value={formMail.username} onChange={e => setFormMail({...formMail, username: e.target.value})} placeholder="utilisateur@domaine.com" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Mot de passe</label>
                              <input type="password"  className="form-input" value={formMail.password} onChange={e => setFormMail({...formMail, password: e.target.value})} placeholder="••••••••" />
                            </div>
                          </div>
                        </div>

                        {/* Expéditeur */}
                        <div className="md:col-span-2 space-y-6 pt-4 border-t border-slate-100">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-3.5 h-3.5" /> Paramètres d'envoi
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Email expéditeur *</label>
                              <input type="email" required className="form-input" value={formMail.from_email} onChange={e => setFormMail({...formMail, from_email: e.target.value})} placeholder="noreply@cnps.ci" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Nom expéditeur *</label>
                              <input type="text" required className="form-input" value={formMail.from_name} onChange={e => setFormMail({...formMail, from_name: e.target.value})} placeholder="eRéclamations CNPS" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${formMail.is_active ? 'bg-green-100' : 'bg-slate-200'}`}>
                            <AlertCircle className={`w-5 h-5 ${formMail.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Activer les notifications automatiques</p>
                            <p className="text-xs text-slate-500 font-medium">Si désactivé, aucun email ne sera envoyé par le système.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={formMail.is_active} onChange={e => setFormMail({...formMail, is_active: e.target.checked})} className="sr-only peer" />
                          <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cnps-800"></div>
                        </label>
                      </div>

                      <div className="flex justify-end gap-4 pt-4">
                        <button 
                          type="button" 
                          onClick={handleTestMail} 
                          disabled={testingMail || saving} 
                          className="btn-secondary !py-4 !px-8 !text-xs font-black uppercase shadow-md flex items-center gap-3 border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          {testingMail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                          Tester la configuration
                        </button>
                        <button 
                          type="submit" 
                          disabled={saving || testingMail} 
                          className="btn-primary !py-4 !px-10 !text-xs font-black uppercase shadow-xl flex items-center gap-3"
                        >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          Enregistrer la configuration
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {tab === 'audit' && Array.isArray(data) && (
              <div className="overflow-hidden">
                <table className="table-cnps">
                  <thead>
                    <tr>
                      <th className="w-40">Date & Heure</th>
                      <th className="w-40">Acteur</th>
                      <th className="w-32">Type</th>
                      <th>Événement / Commentaire</th>
                      <th className="w-32">Référence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4">
                          <div className="text-xs font-black text-slate-900">{new Date(log.date_action).toLocaleString()}</div>
                        </td>
                        <td>
                          <div className="text-xs font-bold text-slate-600">{log.acteur_nom}</div>
                          <div className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">ID: {log.acteur_id || 'SYS'}</div>
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${AUDIT_ACTION_COLORS[log.action_type] || 'bg-slate-100 text-slate-500'}`}>
                            {(log.action_type || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="text-sm font-bold text-slate-800 leading-tight">{log.commentaire}</div>
                          {log.metadata && (
                            <div className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-50 p-1 rounded border border-slate-100 font-mono">
                              {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)}
                            </div>
                          )}
                        </td>
                        <td>
                          {log.numero_ticket ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-cnps-50 text-cnps-800 rounded-lg font-black text-[10px]">
                               <Tag className="w-3 h-3" />
                              {log.numero_ticket}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic">— Global —</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {tab !== 'analytics' && totalPages > 1 && (
              <div className="flex items-center justify-between px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Page {currentPage} sur {totalPages}</p>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            </div>
          )}
        </>
      )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">{getModalTitle()}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
                {modalTarget === 'regime' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Libellé du régime *</label>
                      <input type="text" required className="form-input font-bold" value={formRegime.libelle} onChange={e => setFormRegime({...formRegime, libelle: e.target.value})} placeholder="Ex: Salariés" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-black uppercase text-slate-500 block">Informations Employeur requises</span>
                        <span className="text-[10px] text-slate-400 font-bold italic">Demander Raison sociale, Employeur et N° CNPS lors de la saisine</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formRegime.has_employeur} onChange={e => setFormRegime({...formRegime, has_employeur: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                )}
                {modalTarget === 'type_client' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Régime associé *</label><select required className="form-select font-bold" value={formTypeClient.regime_id} onChange={e => setFormTypeClient({...formTypeClient, regime_id: e.target.value})}><option value="">— Sélectionner —</option>{regimesList.map(r => <option key={r.id} value={r.id}>{r.libelle}</option>)}</select></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Type de Client *</label><input type="text" required className="form-input font-bold" value={formTypeClient.libelle} onChange={e => setFormTypeClient({...formTypeClient, libelle: e.target.value})} placeholder="Ex: Pensionné" /></div></div>)}
                {modalTarget === 'category_cause' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Processus métier *</label><select required className="form-select font-bold" value={formCategoryCause.processus_id} onChange={e => setFormCategoryCause({...formCategoryCause, processus_id: e.target.value})}><option value="">— Sélectionner —</option>{processusList.map(p => <option key={p.id} value={p.id}>{p.libelle}</option>)}</select></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Catégorie de cause *</label><input type="text" required className="form-input font-bold" value={formCategoryCause.libelle} onChange={e => setFormCategoryCause({...formCategoryCause, libelle: e.target.value})} placeholder="Ex: Problème technique" /></div></div>)}
                {modalTarget === 'cause' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Catégorie de cause *</label><select required className="form-select font-bold" value={formCause.categorie_id} onChange={e => setFormCause({...formCause, categorie_id: e.target.value})}><option value="">— Sélectionner —</option>{causesData?.categories?.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}</select></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Libellé de la cause *</label><input type="text" required className="form-input font-bold" value={formCause.libelle} onChange={e => setFormCause({...formCause, libelle: e.target.value})} placeholder="Ex: Erreur de frappe" /></div><div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><div><span className="text-[11px] font-black uppercase text-slate-500 block">Statut de la cause</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={formCause.actif} onChange={e => setFormCause({...formCause, actif: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div></label></div></div>)}
                {modalTarget === 'processus' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Libellé complet *</label><input type="text" required className="form-input font-bold" value={formProcessus.libelle} onChange={e => setFormProcessus({...formProcessus, libelle: e.target.value})} placeholder="Ex: Prestations Familiales" /></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Code Identification *</label><input type="text" required className="form-input font-mono text-cnps-800 font-black uppercase" value={formProcessus.code} onChange={e => setFormProcessus({...formProcessus, code: e.target.value})} placeholder="Ex: PF" /></div></div>)}
                {modalTarget === 'agences' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Dénomination *</label><input type="text" required className="form-input font-bold" value={formAgence.nom} onChange={e => setFormAgence({...formAgence, nom: e.target.value})} placeholder="Ex: Agence de San Pedro" /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Code Agence *</label><input type="text" required className="form-input font-mono font-black uppercase" value={formAgence.code} onChange={e => setFormAgence({...formAgence, code: e.target.value})} placeholder="Ex: ASP" /></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Type d'Unité *</label><select className="form-select font-bold" value={formAgence.type} onChange={e => setFormAgence({...formAgence, type: e.target.value})}><option value="agence">Agence Sociale</option><option value="centrale">Direction Centrale</option></select></div></div></div>)}
                {modalTarget === 'motifs' && (<div className="grid gap-6"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Régime *</label><select required className="form-select font-bold" value={formMotif.regime_id} onChange={e => setFormMotif({...formMotif, regime_id: e.target.value})}><option value="">— Sélectionner —</option>{regimesList.map(r => <option key={r.id} value={r.id}>{r.libelle}</option>)}</select></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Type de Client *</label><select required className="form-select font-bold" value={formMotif.type_client_id} onChange={e => setFormMotif({...formMotif, type_client_id: e.target.value})}><option value="">— Sélectionner —</option>{regimesData.types.filter(t => t.regime_id == formMotif.regime_id).map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}</select></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Motif *</label><textarea required className="form-input font-bold min-h-[100px]" value={formMotif.libelle} onChange={e => setFormMotif({...formMotif, libelle: e.target.value})} placeholder="Ex: Contestation de mise en demeure" /></div></div>)}
                {modalTarget === 'ressources' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Matricule *</label>
                      <input type="text" required className="form-input font-mono font-black uppercase" value={formRessource.matricule} onChange={e => setFormRessource({...formRessource, matricule: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom *</label>
                        <input type="text" required className="form-input font-bold" value={formRessource.nom} onChange={e => setFormRessource({...formRessource, nom: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prénoms *</label>
                        <input type="text" required className="form-input font-bold" value={formRessource.prenoms} onChange={e => setFormRessource({...formRessource, prenoms: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Agence d'Affectation *</label>
                      <select required className="form-select font-bold" value={formRessource.agence_id} onChange={e => setFormRessource({...formRessource, agence_id: e.target.value})}>
                        <option value="">— Sélectionner —</option>
                        {agencesList.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-black uppercase text-slate-500 block">Statut de la ressource</span>
                        <span className="text-[10px] text-slate-400 font-bold italic">Permet d'activer ou désactiver cette personne</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formRessource.actif} onChange={e => setFormRessource({...formRessource, actif: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                )}
                {modalTarget === 'affectations' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Agence concernée *</label>
                      <select required disabled={editMode} className="form-select font-bold" value={formAffectation.agence_id} onChange={e => setFormAffectation({...formAffectation, agence_id: e.target.value, pilote_id: ''})}>
                        <option value="">— Sélectionner une agence —</option>
                        {agencesList.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Processus métier *</label>
                      <select required disabled={editMode} className="form-select font-bold" value={formAffectation.processus_id} onChange={e => setFormAffectation({...formAffectation, processus_id: e.target.value})}>
                        <option value="">— Sélectionner un processus —</option>
                        {processusList.map(p => <option key={p.id} value={p.id}>{p.libelle}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Pilote à assigner *</label>
                      <select required className="form-select font-bold text-cnps-800" value={formAffectation.pilote_id} onChange={e => setFormAffectation({...formAffectation, pilote_id: e.target.value})}>
                        <option value="">— Sélectionner un pilote —</option>
                        {pilotesList
                          .filter(u => !formAffectation.agence_id || u.agence_id == formAffectation.agence_id)
                          .map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenoms}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {modalTarget === 'sous_motifs' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Motif Parent *</label>
                      <select required className="form-select font-bold" value={formSousMotif.motif_id} onChange={e => setFormSousMotif({...formSousMotif, motif_id: e.target.value})}>
                        <option value="">— Sélectionner un motif —</option>
                        {data.map(m => <option key={m.id} value={m.id}>{m.regime_libelle} - {m.type_client_libelle} : {m.libelle}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Libellé du Sous-motif *</label>
                      <input type="text" required className="form-input font-bold" value={formSousMotif.libelle} onChange={e => setFormSousMotif({...formSousMotif, libelle: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Délai de traitement (SLA en jours) *</label>
                      <input type="number" required min="1" className="form-input font-bold" value={formSousMotif.delai_traitement_jours} onChange={e => setFormSousMotif({...formSousMotif, delai_traitement_jours: e.target.value})} />
                    </div>
                  </div>
                )}
                {modalTarget === 'modes_saisine' && (
                  <div className="grid gap-6">
                    <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Libellé du mode de saisine *</label><input type="text" required className="form-input font-bold" value={formModeSaisine.libelle} onChange={e => setFormModeSaisine({...formModeSaisine, libelle: e.target.value})} /></div>
                  </div>
                )}
                {modalTarget === 'utilisateurs' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Ressource liée (Optionnel)</label>
                      <select 
                        className="form-select font-bold border-indigo-200 bg-indigo-50/30" 
                        value={formUser.ressource_id} 
                        onChange={e => onSelectRessource(e.target.value)}
                      >
                        <option value="">— Saisir manuellement —</option>
                        {ressourcesList
                          .filter(r => !r.linked_user_id || (editMode && r.id === formUser.ressource_id))
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.matricule} - {r.nom} {r.prenoms}</option>
                          ))
                        }
                      </select>
                    </div>
<div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom *</label><input type="text" required className="form-input font-bold" value={formUser.prenoms} onChange={e => setFormUser({...formUser, prenoms: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prénoms *</label><input type="text" required className="form-input font-bold" value={formUser.nom} onChange={e => setFormUser({...formUser, nom: e.target.value})} /></div></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Email / Identifiant *</label><input type="email" required className="form-input font-bold" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">{editMode ? 'Nouveau mot de passe (Laisser vide pour ne pas changer)' : 'Mot de passe *'}</label><input type="password" required={!editMode} className="form-input" value={formUser.password} onChange={e => setFormUser({...formUser, password: e.target.value})} /></div>                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Rôle Système *</label>
                      <select className="form-select font-bold" value={formUser.role} onChange={e => setFormUser({...formUser, role: e.target.value})}>
                        {Object.entries(ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Agence d'Affectation *</label>
                      <select required className="form-select font-bold" value={formUser.agence_id} onChange={e => setFormUser({...formUser, agence_id: e.target.value})}>
                        <option value="">— Sélectionner —</option>
                        {agencesList.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-black uppercase text-slate-500 block">Statut du compte</span>
                        <span className="text-[10px] text-slate-400 font-bold italic">Permet d'activer ou désactiver l'accès au système</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formUser.actif} onChange={e => setFormUser({...formUser, actif: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                )}
                {modalTarget === 'interims' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Filtrer par Profil</label>
                      <select 
                        className="form-select font-bold border-cnps-100 bg-cnps-50/10"
                        value={interimRoleFilter}
                        onChange={(e) => {
                          const role = e.target.value
                          setInterimRoleFilter(role)
                          const roleParam = role || 'superviseur,coordonnateur'
                          parametrageApi.utilisateurs({ role: roleParam }).then(u => setUsersList(u?.data || []))
                        }}
                      >
                        <option value="">Tous les profils (Superviseurs & Managers)</option>
                        <option value="superviseur">Superviseurs</option>
                        <option value="coordonnateur">Managers de Service/Section</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Utilisateur concerné *</label>
                      <select required className="form-select font-bold" value={formInterim.user_id} onChange={e => setFormInterim({...formInterim, user_id: e.target.value})}>
                        <option value="">— Sélectionner un utilisateur —</option>
                        {usersList.map(u => <option key={u.id} value={u.id}>{u.prenoms} {u.nom} ({u.matricule})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Agence d'intérim *</label>
                      <select required className="form-select font-bold" value={formInterim.agence_id} onChange={e => setFormInterim({...formInterim, agence_id: e.target.value})}>
                        <option value="">— Sélectionner l'agence —</option>
                        {(() => {
                          const selectedUser = usersList.find(u => u.id == formInterim.user_id);
                          const ownAgencyId = selectedUser?.agence_id;
                          return agencesList
                            .filter(a => a.id != ownAgencyId)
                            .map(a => (
                              <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>
                            ));
                        })()}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Date début *</label>
                        <input type="date" required className="form-input font-bold" value={formInterim.date_debut} onChange={e => setFormInterim({...formInterim, date_debut: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Date fin *</label>
                        <input type="date" required className="form-input font-bold" value={formInterim.date_fin} onChange={e => setFormInterim({...formInterim, date_fin: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
                {modalTarget === 'suggestions' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Titre du modèle *</label>
                      <input type="text" required className="form-input font-bold" value={formSuggestion.titre} onChange={e => setFormSuggestion({...formSuggestion, titre: e.target.value})} placeholder="Ex: Clôture pour manque de pièces" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Lier à un Motif (Optionnel)</label>
                        <select className="form-select text-xs font-bold" value={formSuggestion.motif_id} onChange={e => setFormSuggestion({...formSuggestion, motif_id: e.target.value, cause_id: ''})}>
                          <option value="">— Non lié —</option>
                          {motifsList.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Lier à une Cause (Optionnel)</label>
                        <select className="form-select text-xs font-bold" value={formSuggestion.cause_id} onChange={e => setFormSuggestion({...formSuggestion, cause_id: e.target.value, motif_id: ''})}>
                          <option value="">— Non lié —</option>
                          {causesList.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Contenu du message *</label>
                      <textarea required className="form-input font-medium min-h-[200px] text-sm leading-relaxed" value={formSuggestion.contenu} onChange={e => setFormSuggestion({...formSuggestion, contenu: e.target.value})} placeholder="Saisissez ici le modèle de réponse..." />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-black uppercase text-slate-500 block">Modèle actif</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formSuggestion.actif} onChange={e => setFormSuggestion({...formSuggestion, actif: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                )}
                {modalTarget === 'travailleurs' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Numéro CNPS *</label>
                      <input type="text" required className="form-input font-mono font-black" value={formTravailleur.numero_cnps} onChange={e => setFormTravailleur({...formTravailleur, numero_cnps: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom *</label>
                        <input type="text" required className="form-input font-bold" value={formTravailleur.nom} onChange={e => setFormTravailleur({...formTravailleur, nom: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prénoms *</label>
                        <input type="text" required className="form-input font-bold" value={formTravailleur.prenoms} onChange={e => setFormTravailleur({...formTravailleur, prenoms: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Téléphone</label>
                      <input type="text" className="form-input font-bold" value={formTravailleur.telephone} onChange={e => setFormTravailleur({...formTravailleur, telephone: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Email</label>
                      <input type="email" className="form-input font-bold" value={formTravailleur.email} onChange={e => setFormTravailleur({...formTravailleur, email: e.target.value})} />
                    </div>
                  </div>
                )}
                {modalTarget === 'employeurs' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Numéro CNPS Employeur *</label>
                      <input type="text" required className="form-input font-mono font-black" value={formEmployeur.numero_cnps} onChange={e => setFormEmployeur({...formEmployeur, numero_cnps: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Raison Sociale *</label>
                      <input type="text" required className="form-input font-bold" value={formEmployeur.raison_sociale} onChange={e => setFormEmployeur({...formEmployeur, raison_sociale: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom de l'employeur / Contact (Optionnel)</label>
                      <input type="text" className="form-input font-bold" value={formEmployeur.nom_employeur} onChange={e => setFormEmployeur({...formEmployeur, nom_employeur: e.target.value})} placeholder="Par défaut, identique à la raison sociale" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Téléphone</label>
                      <input type="text" className="form-input font-bold" value={formEmployeur.telephone} onChange={e => setFormEmployeur({...formEmployeur, telephone: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Email de l'employeur</label>
                      <input type="email" className="form-input font-bold" value={formEmployeur.email} onChange={e => setFormEmployeur({...formEmployeur, email: e.target.value})} placeholder="employeur@exemple.com" />
                    </div>
                  </div>
                )}
                {modalTarget === 'sinistres' && (
                  <div className="grid gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Numéro de Sinistre *</label>
                      <input type="text" required className="form-input font-mono font-black" value={formSinistre.numero_sinistre} onChange={e => setFormSinistre({...formSinistre, numero_sinistre: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom *</label>
                        <input type="text" required className="form-input font-bold" value={formSinistre.nom} onChange={e => setFormSinistre({...formSinistre, nom: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prénoms *</label>
                        <input type="text" required className="form-input font-bold" value={formSinistre.prenoms} onChange={e => setFormSinistre({...formSinistre, prenoms: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Téléphone</label>
                      <input type="text" className="form-input font-bold" value={formSinistre.telephone} onChange={e => setFormSinistre({...formSinistre, telephone: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Email</label>
                      <input type="email" className="form-input font-bold" value={formSinistre.email} onChange={e => setFormSinistre({...formSinistre, email: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-[11px] text-amber-800 font-bold"><ShieldCheck className="w-5 h-5 shrink-0" /><p>Toute modification est tracée et impactera les formulaires de saisie en temps réel.</p></div>
              </div>
              <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-4 mt-auto shrink-0"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-400">Annuler</button><button type="submit" disabled={saving} className="btn-primary !rounded-2xl !py-3 !px-10 !text-xs font-black uppercase shadow-xl flex items-center gap-3">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editMode ? 'Mettre à jour' : 'Enregistrer'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
