import React, { useState, useEffect } from 'react'
import { 
  BookOpen, Search, Filter, Plus, Book, 
  MessageSquare, CheckSquare, ChevronRight,
  Loader2, Trash2, Edit2, X, Save, AlertTriangle
} from 'lucide-react'
import { kbApi, parametrageApi } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlert } from '../context/AlertContext.jsx'
import Modal from '../components/ui/Modal.jsx'

export default function KnowledgeBase() {
  const { user, isAdmin, isSuper } = useAuth()
  const swal = useAlert()
  const canEdit = isAdmin() || isSuper()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [selectedProcessus, setSelectedProcessus] = useState('')
  const [processusList, setProcessusList] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [motifsList, setMotifsList] = useState([])
  const [sousMotifsList, setSousMotifsList] = useState([])

  const [form, setForm] = useState({
    id: null,
    sous_motif_id: '',
    titre: '',
    analyse_type: '',
    actions_types: [{ libelle: '' }],
    actif: true
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await kbApi.list({ q: search })
      setData(res?.data || [])
    } catch (e) {
      swal.error("Erreur", "Impossible de charger la base de connaissances")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    parametrageApi.processus().then(res => setProcessusList(res?.data || []))
    parametrageApi.motifs().then(res => setMotifsList(res?.data || []))
  }, [search])

  const handleOpenCreate = () => {
    setForm({
      id: null,
      sous_motif_id: '',
      titre: '',
      analyse_type: '',
      actions_types: [{ libelle: '' }],
      actif: true
    })
    setEditMode(false)
    setShowModal(true)
  }

  const handleOpenEdit = (entry) => {
    setForm({
      ...entry,
      actions_types: Array.isArray(entry.actions_types) ? entry.actions_types : JSON.parse(entry.actions_types || '[]')
    })
    setEditMode(true)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editMode) {
        await kbApi.update(form.id, form)
        swal.success("Succès", "Entrée mise à jour")
      } else {
        await kbApi.save(form)
        swal.success("Succès", "Entrée créée")
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      swal.error("Erreur", e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirm = await swal.confirm("Supprimer ?", "Cette action est irréversible")
    if (!confirm) return
    try {
      await kbApi.delete(id)
      swal.success("Supprimé")
      fetchData()
    } catch (e) { swal.error("Erreur", e.message) }
  }

  const addAction = () => {
    setForm({ ...form, actions_types: [...form.actions_types, { libelle: '' }] })
  }

  const removeAction = (index) => {
    const newActions = form.actions_types.filter((_, i) => i !== index)
    setForm({ ...form, actions_types: newActions })
  }

  const updateAction = (index, val) => {
    const newActions = [...form.actions_types]
    newActions[index].libelle = val
    setForm({ ...form, actions_types: newActions })
  }

  const filteredData = data.filter(item => {
    if (selectedProcessus && item.processus_id != selectedProcessus) return false
    return true
  })

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-cnps-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-cnps-800" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Base de Connaissances</h1>
          </div>
          <p className="text-slate-500 font-medium">Recueil des analyses et actions de traitement de référence</p>
        </div>
        {canEdit && (
          <button 
            onClick={handleOpenCreate}
            className="btn-primary !rounded-2xl !py-3 !px-6 shadow-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            AJOUTER UNE RÉFÉRENCE
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Rechercher une analyse, un mot-clé, un titre..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-cnps-800/20 outline-none font-medium transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select 
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-10 pr-4 shadow-sm outline-none font-bold text-xs uppercase appearance-none cursor-pointer"
            value={selectedProcessus}
            onChange={e => setSelectedProcessus(e.target.value)}
          >
            <option value="">Tous les processus</option>
            {processusList.map(p => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-cnps-800 animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Book className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Aucun résultat trouvé</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">Ajustez vos filtres ou effectuez une nouvelle recherche pour trouver l'aide dont vous avez besoin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredData.map(item => (
            <div key={item.id} className="group bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border-b-4 border-b-cnps-800/10 hover:border-b-cnps-800">
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 bg-cnps-50 text-cnps-800 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  {item.processus_libelle}
                </span>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-cnps-800 hover:bg-cnps-50 rounded-xl transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-cnps-800 transition-colors">
                {item.titre}
              </h3>
              
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-4 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-cnps-500" />
                {item.motif_libelle} / {item.sous_motif_libelle}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex-1">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <MessageSquare className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Analyse recommandée</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 italic">
                  "{item.analyse_type}"
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <CheckSquare className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Actions types</span>
                </div>
                {(() => {
                  try {
                    const actions = typeof item.actions_types === 'string' 
                      ? JSON.parse(item.actions_types || '[]') 
                      : (item.actions_types || []);
                    return actions.slice(0, 3).map((act, idx) => (
                      <div key={idx} className="text-[11px] font-bold text-slate-700 bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cnps-500 rounded-full" />
                        {act.libelle}
                      </div>
                    ));
                  } catch (e) {
                    return <p className="text-[10px] text-red-400">Erreur de format des actions</p>;
                  }
                })()}
                {(() => {
                  try {
                    const actions = typeof item.actions_types === 'string' 
                      ? JSON.parse(item.actions_types || '[]') 
                      : (item.actions_types || []);
                    return actions.length > 3 && (
                      <div className="text-[9px] font-bold text-slate-400 pl-4">
                        + {actions.length - 3} autres actions
                      </div>
                    );
                  } catch (e) { return null; }
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'édition/création */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editMode ? "Modifier la référence" : "Nouvelle référence KB"}
        size="lg"
      >
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Titre de la référence *</label>
              <input 
                type="text" required className="form-input font-bold" 
                value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                placeholder="Ex: Procédure de régularisation retard de pension" 
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Sous-motif concerné *</label>
              <select 
                required className="form-select font-bold text-xs" 
                value={form.sous_motif_id} 
                onChange={e => setForm({...form, sous_motif_id: e.target.value})}
              >
                <option value="">Sélectionnez un sous-motif...</option>
                {motifsList.map(m => {
                  const sms = typeof m.sous_motifs === 'string' ? JSON.parse(m.sous_motifs || '[]') : (m.sous_motifs || []);
                  return (
                    <optgroup key={m.id} label={m.libelle}>
                      {sms.map(sm => (
                        <option key={sm.id} value={sm.id}>{sm.libelle}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Analyse type détaillée *</label>
              <textarea 
                required className="form-input min-h-[150px] text-sm leading-relaxed" 
                value={form.analyse_type} onChange={e => setForm({...form, analyse_type: e.target.value})}
                placeholder="Décrivez l'analyse de référence pour ce cas..."
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Actions de traitement types</label>
                <button type="button" onClick={addAction} className="text-[10px] font-black uppercase text-cnps-800 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Ajouter une action
                </button>
              </div>
              <div className="space-y-3">
                {form.actions_types.map((act, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" required className="form-input !py-2 !text-xs font-bold" 
                      value={act.libelle} onChange={e => updateAction(idx, e.target.value)}
                      placeholder="Libellé de l'action..."
                    />
                    {form.actions_types.length > 1 && (
                      <button type="button" onClick={() => removeAction(idx)} className="p-2 text-slate-300 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-400">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary !rounded-2xl !py-3 !px-10 shadow-xl flex items-center gap-3">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editMode ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
