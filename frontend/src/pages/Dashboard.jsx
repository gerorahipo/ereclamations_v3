import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  Search, Filter, PlusCircle, ExternalLink, Clock,
  AlertTriangle, RefreshCw, ChevronDown, CheckCircle, RotateCcw,
  Users, BarChart3, PieChart as PieChartIcon, TrendingUp,
  FileText, CheckSquare, AlertCircle, List, UserMinus, Tag
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PieChart as RePieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts'
import { reclamationsApi, parametrageApi } from '../api/index.js'
import StatusBadge from '../components/tickets/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { exportToExcel, exportToPDF } from '../utils/exportUtils.js'

const STATUTS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'nouveau',   label: 'Non affectées' },
  { value: 'en_cours',  label: 'En cours' },
  { value: 'a_valider', label: 'À Valider' },
  { value: 'resolu',    label: 'Résolu' },
  { value: 'rejete',    label: 'Rejeté' },
]

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#6366f1', '#06b6d4', '#ec4899']

const ROLE_LABELS = {
  agent:         'Agent de guichet',
  pilote:        'Pilote de processus',
  coordonnateur: 'Manager de service/section accueil réclamations',
  superviseur:   'Superviseur National',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [tickets, setTickets]       = useState([])
  const [stats, setStats]           = useState(null)
  const [processus, setProcessus]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [analyticsData, setAnalyticsData] = useState({ agences: [], processus: [], evolution: [] })
  const [view, setView] = useState('analytics') // 'analytics' or 'tickets'

  const [filters, setFilters] = useState({
    statut:       searchParams.get('statut') || '',
    processus_id: '',
    q:            '',
    hors_sla:     searchParams.get('statut') === 'hors_sla' ? '1' : '',
    queue:        '',
    correction:   '',
  })

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.statut && filters.statut !== 'hors_sla') params.statut = filters.statut
      if (filters.processus_id) params.processus_id = filters.processus_id
      if (filters.q)            params.q = filters.q
      if (filters.hors_sla)     params.hors_sla = filters.hors_sla
      if (filters.queue)        params.queue = filters.queue
      if (filters.correction)   params.correction = filters.correction

      const [rec, st] = await Promise.all([
        reclamationsApi.list(params),
        parametrageApi.stats(),
      ])

      if (user.role === 'administrateur' || user.role === 'superviseur') {
        const analyticsRes = await parametrageApi.analytics()
        setAnalyticsData(analyticsRes?.data || { agences: [], processus: [], evolution: [] })
      }

      console.log('Dashboard Data:', { role: user.role, agence: user.agence_nom, tickets: rec?.data?.length, stats: st?.data?.counters })
      setTickets(rec?.data || [])
      setStats(st?.data || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    parametrageApi.processus().then(d => setProcessus(d?.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const statut = searchParams.get('statut') || ''
    const queue = searchParams.get('queue') || ''
    setFilters(f => ({
      ...f,
      statut: statut !== 'hors_sla' ? statut : '',
      hors_sla: statut === 'hors_sla' ? '1' : '',
      queue: queue
    }))
    // Switch to tickets view if a filter is applied via URL
    if (statut || queue) setView('tickets')
  }, [searchParams])

  useEffect(() => { fetchData() }, [filters])

  const handleFilter = (key, val) => {
    setFilters(f => {
      const next = { ...f, [key]: val }
      if (key !== 'queue' && f.queue !== 'escaladees' && f.queue !== 'non_qualifiees') {
        next.queue = ''
      }
      if (key !== 'correction') {
        next.correction = ''
      }
      return next
    })
    if (val && view === 'analytics') setView('tickets')
  }

  const getSlaDays = (ticket) => {
    if (ticket.statut === 'resolu') return null
    const diff = differenceInDays(new Date(ticket.date_echeance_sla), new Date())
    return diff
  }

    const getKPIs = () => {
        if (!stats?.counters || !user) return []
        const c = stats?.counters || {}
        const role = user.role
        
        const isDigitalAgency = user?.agence_nom?.toLowerCase()?.includes('digitale') || false
        
        const kpis = []
        
        kpis.push({ 
            label: isDigitalAgency ? 'Toutes agences' : (role === 'agent' ? 'Mes saisies' : 'Total agence'), 
            value: c.total || 0, 
            color: 'bg-indigo-700', 
            icon: <Users className="w-5 h-5 text-white/80" />,
            filter: { statut: '', hors_sla: '', queue: '', q: '' }
        })
        const showNonQualifiees = isDigitalAgency || role === 'administrateur'

        if (showNonQualifiees) {
            kpis.push({
                label: 'Non qualifiées',
                value: c.non_qualifiees || 0,
                color: 'bg-fuchsia-600',
                icon: <Tag className="w-5 h-5 text-white/80" />,
                filter: { queue: 'non_qualifiees', statut: '', hors_sla: '', correction: '', q: '' }
            })
        }

        if (role === 'agent') {
            kpis.push({ label: 'Non affectées', value: c.nouveau, color: 'bg-blue-500', icon: <UserMinus className="w-5 h-5 text-white/80" />, filter: { statut: 'nouveau', hors_sla: '', queue: '' } })
            kpis.push({ label: 'En cours', value: c.en_cours, color: 'bg-orange-500', icon: <Clock className="w-5 h-5 text-white/80" />, filter: { statut: 'en_cours', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Résolus', value: c.resolu, color: 'bg-emerald-600', icon: <CheckCircle className="w-5 h-5 text-white/80" />, filter: { statut: 'resolu', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Hors délai', value: c.hors_sla, color: 'bg-red-600', icon: <AlertTriangle className="w-5 h-5 text-white/80" />, alert: true, filter: { statut: '', hors_sla: '1', queue: '' } })
        } 
        else if (role === 'pilote') {
            kpis.push({ label: 'Non affectées', value: c.nouveau, color: 'bg-blue-500', icon: <UserMinus className="w-5 h-5 text-white/80" />, filter: { statut: 'nouveau', hors_sla: '', queue: '', correction: '' } })
            kpis.push({ label: 'À traiter', value: Math.max(0, parseInt(c.en_cours || 0) - parseInt(c.en_attente_correction || 0)), color: 'bg-orange-500', icon: <FileText className="w-5 h-5 text-white/80" />, filter: { statut: 'en_cours', hors_sla: '', queue: '', correction: '' } })
            kpis.push({ label: 'À corriger', value: c.en_attente_correction || 0, color: 'bg-amber-500', icon: <RotateCcw className="w-5 h-5 text-white/80" />, pulse: parseInt(c.en_attente_correction || 0) > 0, filter: { correction: '1', statut: '', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Hors délai', value: c.hors_sla, color: 'bg-red-600', icon: <AlertTriangle className="w-5 h-5 text-white/80" />, alert: true, filter: { statut: '', hors_sla: '1', queue: '', correction: '' } })
            kpis.push({ label: 'Dossiers Résolus', value: c.resolu, color: 'bg-emerald-600', icon: <CheckSquare className="w-5 h-5 text-white/80" />, filter: { statut: 'resolu', hors_sla: '', queue: '', correction: '' } })
            kpis.push({ label: 'Suivi escalades', value: c.escaladees || 0, color: 'bg-violet-600', icon: <RotateCcw className="w-5 h-5 text-white/80" />, filter: { queue: 'escaladees', statut: '', hors_sla: '', correction: '' } })
        }
        else if (role === 'coordonnateur') {
            kpis.push({ label: 'Non affectées', value: c.nouveau, color: 'bg-blue-500', icon: <UserMinus className="w-5 h-5 text-white/80" />, filter: { statut: 'nouveau', hors_sla: '', queue: '' } })
            kpis.push({ label: 'À clôturer', value: c.a_valider, color: 'bg-violet-600', icon: <CheckSquare className="w-5 h-5 text-white/80" />, pulse: parseInt(c.a_valider || 0) > 0, filter: { statut: 'a_valider', hors_sla: '', queue: '' } })
            kpis.push({ label: 'En cours Agence', value: c.en_cours, color: 'bg-orange-500', icon: <Users className="w-5 h-5 text-white/80" />, filter: { statut: 'en_cours', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Hors délai Agence', value: c.hors_sla, color: 'bg-red-600', icon: <AlertTriangle className="w-5 h-5 text-white/80" />, filter: { statut: '', hors_sla: '1', queue: '' } })
            kpis.push({ label: 'Suivi escalades', value: c.escaladees || 0, color: 'bg-violet-700', icon: <RotateCcw className="w-5 h-5 text-white/80" />, filter: { queue: 'escaladees', statut: '', hors_sla: '' } })
        }
        else { // Superviseur / Admin
            kpis.push({ label: 'Non affectées', value: c.nouveau, color: 'bg-blue-500', icon: <AlertCircle className="w-5 h-5 text-white/80" />, filter: { statut: 'nouveau', hors_sla: '', queue: '' } })
            kpis.push({ label: 'En cours', value: c.en_cours, color: 'bg-orange-500', icon: <TrendingUp className="w-5 h-5 text-white/80" />, filter: { statut: 'en_cours', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Hors délai', value: c.hors_sla, color: 'bg-red-600', icon: <AlertTriangle className="w-5 h-5 text-white/80" />, filter: { statut: '', hors_sla: '1', queue: '' } })
            kpis.push({ label: 'Clôturés', value: c.resolu, color: 'bg-emerald-600', icon: <CheckCircle className="w-5 h-5 text-white/80" />, filter: { statut: 'resolu', hors_sla: '', queue: '' } })
            kpis.push({ label: 'Suivi escalades', value: c.escaladees || 0, color: 'bg-violet-800', icon: <RotateCcw className="w-5 h-5 text-white/80" />, filter: { queue: 'escaladees', statut: '', hors_sla: '' } })
        }

        return kpis
    }

  const treatedRate = stats?.counters?.total > 0 ? Math.round(((parseInt(stats.counters.resolu) + parseInt(stats.counters.rejete)) / stats.counters.total) * 100) : 0
  const slaDenominator = parseInt(stats?.counters?.resolu || 0) + parseInt(stats?.counters?.rejete || 0) + parseInt(stats?.counters?.hors_sla || 0)
  const slaRate = slaDenominator > 0 ? Math.round((parseInt(stats?.counters?.dans_sla || 0) / slaDenominator) * 100) : 0

  const renderAnalytics = () => {
    const { agences, processus, evolution } = analyticsData

    return (
      <div className="space-y-8 animate-in fade-in zoom-in duration-500">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TMR Global</p>
                <p className="text-2xl font-black text-slate-800">
                  {agences.length ? (agences.reduce((acc, a) => acc + (parseFloat(a.avg_resolution_time) || 0), 0) / (agences.filter(a => a.avg_resolution_time).length || 1)).toFixed(1) : 0}h
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Temps moyen de résolution</p>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><CheckCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Taux SLA National</p>
                <p className="text-2xl font-black text-slate-800">
                  {agences.length ? (agences.reduce((acc, a) => acc + (parseFloat(a.sla_rate) || 0), 0) / (agences.filter(a => a.sla_rate !== null).length || 1)).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Respect des délais (SLA)</p>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Volume Total</p>
                <p className="text-2xl font-black text-slate-800">
                  {agences.reduce((acc, a) => acc + parseInt(a.total_tickets || 0), 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Réclamations enregistrées</p>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><AlertCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hors Délai Actuels</p>
                <p className="text-2xl font-black text-slate-800">
                  {agences.reduce((acc, a) => acc + parseInt(a.current_hors_sla || 0), 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Tickets en retard (Non résolus)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cnps-600" /> Temps Moyen de Résolution par Agence (Heures)
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agences.filter(a => a.total_tickets > 0)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="nom" type="category" fontSize={10} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="avg_resolution_time" name="TMR (h)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Taux de Respect SLA par Agence (%)
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agences.filter(a => a.total_tickets > 0)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="nom" type="category" fontSize={10} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="sla_rate" name="SLA (%)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Évolution du volume (6 derniers mois)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="total" name="Reçues" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="resolu" name="Résolues" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" /> Répartition par Processus
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={processus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="libelle"
                  >
                    {processus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Détails de performance par agence</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Agence</th>
                  <th className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Tickets</th>
                  <th className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">TMR (h)</th>
                  <th className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">SLA (%)</th>
                  <th className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Hors Délai Actuels</th>
                </tr>
              </thead>
              <tbody>
                {agences.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4"><span className="text-sm font-bold text-slate-800">{a.nom}</span> <span className="text-[9px] font-black text-slate-300 ml-1">({a.code})</span></td>
                    <td className="px-8 py-4 text-center text-sm font-black text-slate-600">{a.total_tickets}</td>
                    <td className="px-8 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black ${parseFloat(a.avg_resolution_time) > 48 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {a.avg_resolution_time ? parseFloat(a.avg_resolution_time).toFixed(1) : '-'}h
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {a.total_tickets > 0 ? (
                          <>
                            <span className={`text-xs font-black ${(parseFloat(a.sla_rate) || 0) < 80 ? 'text-orange-600' : 'text-green-600'}`}>
                              {a.sla_rate !== null ? parseFloat(a.sla_rate).toFixed(1) : '0.0'}%
                            </span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${(parseFloat(a.sla_rate) || 0) < 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{width: `${a.sla_rate || 0}%`}}></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      {parseInt(a.current_hors_sla) > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black">{a.current_hors_sla} en retard</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">Aucun retard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{user?.agence_nom}</span>
            <span>•</span>
            <span className="text-cnps-800 font-semibold">{ROLE_LABELS[user?.role] || user?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'administrateur' || user?.role === 'superviseur') && (
            <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setView('analytics')}
                className={clsx(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2",
                  view === 'analytics' ? "bg-white text-cnps-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Performance
              </button>
              <button 
                onClick={() => setView('tickets')}
                className={clsx(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2",
                  view === 'tickets' ? "bg-white text-cnps-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="w-4 h-4" />
                Opérations
              </button>
            </div>
          )}
          {(user?.role !== 'administrateur' && user?.role !== 'superviseur') && (
            <button
              onClick={() => navigate('/reclamations/nouvelle')}
              className="btn-primary shadow-lg shadow-cnps-100"
            >
              <PlusCircle className="w-4 h-4" />
              Nouvelle réclamation
            </button>
          )}
        </div>
      </div>

      {view === 'analytics' ? (
        user?.role === 'administrateur' || user?.role === 'superviseur' ? (
          renderAnalytics()
        ) : (
          <>
            {/* KPI Cards section */}
            <div className="flex flex-wrap gap-4 min-h-[100px]">
              <div className={clsx(
                "grid grid-cols-2 flex-1 gap-4",
                getKPIs().length === 8 ? "md:grid-cols-8" :
                getKPIs().length === 7 ? "md:grid-cols-7" :
                getKPIs().length === 6 ? "md:grid-cols-6" :
                "md:grid-cols-5"
              )}>
                {getKPIs().map((kpi, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (kpi.filter) {
                        setFilters(prev => ({ ...prev, ...kpi.filter }));
                        setView('tickets');
                      }
                    }}
                    className={clsx(
                      "rounded-xl p-4 text-white shadow-md transition-transform hover:scale-[1.02] cursor-pointer",
                      kpi.color,
                      kpi.pulse && "animate-pulse"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium opacity-90">{kpi.label}</span>
                      {kpi.icon}
                    </div>
                    <div className="text-3xl font-bold">{kpi.value || 0}</div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full lg:w-[400px]">
                <div className="card flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg border-none">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="white" strokeWidth="8" 
                              strokeDasharray={2 * Math.PI * 40} 
                              strokeDashoffset={2 * Math.PI * 40 * (1 - treatedRate / 100)}
                              strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xl font-bold">{treatedRate}%</span>
                  </div>
                  <p className="text-xs font-semibold mt-3 text-center uppercase tracking-wider">Réclamations traitées</p>
                </div>

                <div className="card flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg border-none">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="white" strokeWidth="8" 
                              strokeDasharray={2 * Math.PI * 40} 
                              strokeDashoffset={2 * Math.PI * 40 * (1 - slaRate / 100)}
                              strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xl font-bold">{slaRate}%</span>
                  </div>
                  <p className="text-xs font-semibold mt-3 text-center uppercase tracking-wider">Traitées dans les délais</p>
                </div>
              </div>
            </div>

            {/* Action Banners for Pilote */}
            {user?.role === 'pilote' && (
              <div className="space-y-3 my-6">
                {parseInt(stats?.counters?.en_attente_correction || 0) > 0 && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-lg animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-white">⚠️ Dossiers retournés pour correction</p>
                        <p className="text-sm opacity-90">
                          Vous avez {stats.counters.en_attente_correction} réclamation(s) retournée(s) par le manager de service accueil réclamations.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setFilters(prev => ({ ...prev, correction: '1', statut: '', queue: '', hors_sla: '', q: '' })); setView('tickets'); }}
                      className="bg-white text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors shadow-sm"
                    >
                      Corriger mes dossiers
                    </button>
                  </div>
                )}
                {(parseInt(stats?.counters?.nouveau || 0) > 0 || (parseInt(stats?.counters?.en_cours || 0) - parseInt(stats?.counters?.en_attente_correction || 0)) > 0) && (
                  <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-xl shadow-lg animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <PlusCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold">Dossiers à traiter</p>
                        <p className="text-sm opacity-90">
                          Vous avez {parseInt(stats?.counters?.nouveau || 0) + (parseInt(stats?.counters?.en_cours || 0) - parseInt(stats?.counters?.en_attente_correction || 0))} réclamation(s) (nouvelle ou en cours) nécessitant votre action.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { handleFilter('statut', ''); setView('tickets'); }}
                      className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
                    >
                      Voir mes dossiers
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Graphs Section */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
                {/* Mode de saisine */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-500" />
                    Mode de saisine
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={stats?.saisine || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="libelle"
                        >
                          {(stats?.saisine || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Type de client */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Répartition par client
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={stats?.clients || []}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="libelle" type="category" width={100} fontSize={10} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top 5 Motifs */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Top 5 des motifs de réclamation
                  </h3>
                  <div className="space-y-4">
                    {(stats?.motifs || []).map((m, i) => (
                      <div key={i} className="group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{m.libelle}</span>
                          <span className="text-xs font-bold text-slate-900">{m.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${stats?.counters?.total > 0 ? (m.count / stats.counters.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!stats?.motifs || stats.motifs.length === 0) && <p className="text-center text-slate-400 py-10 text-xs italic">Aucune donnée</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cnps-50 text-cnps-700 rounded-xl">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {filters.queue === 'non_qualifiees' ? 'Réclamations non qualifiées (Portail)' : filters.queue === 'escaladees' ? 'Suivi des réclamations escaladées' : filters.correction === '1' ? 'Dossiers retournés pour correction' : filters.statut ? `Réclamations : ${STATUTS.find(s => s.value === filters.statut)?.label}` : filters.hors_sla ? 'Réclamations Hors Délai' : 'Vue globale des réclamations'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {filters.queue === 'non_qualifiees' ? "Liste des dossiers en attente de qualification par l'Agence Digitale" : filters.queue === 'escaladees' ? 'Liste des dossiers escaladés vers d\'autres structures ou agences' : filters.correction === '1' ? 'Liste des dossiers nécessitant des corrections demandées par la coordination' : 'Affichage de la liste détaillée des dossiers'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setFilters({ statut: '', processus_id: '', q: '', hors_sla: '', queue: '', correction: '' }); setView('analytics'); }} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Retour au tableau de bord
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-3 lg:p-4 border-b border-slate-100 grid grid-cols-1 md:flex md:flex-wrap gap-3 lg:gap-4 items-center bg-slate-50/50">
            <div className="relative flex-1 md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher par numéro, partenaire..."
                    value={filters.q}
                    onChange={e => handleFilter('q', e.target.value)}
                    className="form-input pl-10 border-slate-200"
                />
            </div>
            
            <div className="flex gap-2">
                <select
                    value={filters.statut}
                    onChange={e => handleFilter('statut', e.target.value)}
                    className="form-select w-44"
                >
                    {STATUTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                <select
                    value={filters.processus_id}
                    onChange={e => handleFilter('processus_id', e.target.value)}
                    className="form-select w-48"
                >
                    <option value="">Tous les processus</option>
                    {processus.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.libelle}</option>
                    ))}
                </select>
            </div>

            <button onClick={fetchData} title="Rafraîchir" className="p-2 text-slate-500 hover:text-cnps-800 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
            </button>

            <div className="flex gap-2 w-full md:w-auto md:ml-auto">
                <button 
                  onClick={() => exportToExcel(tickets, 'liste_reclamations')}
                  disabled={tickets.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold border border-green-200 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button 
                  onClick={() => exportToPDF(tickets, 'Rapport des Réclamations')}
                  disabled={tickets.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-bold border border-red-200 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
            </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-cnps-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-cnps">
                <thead>
                <tr>
                    <th className="w-24 lg:w-32">N° Ticket</th>
                    <th>Partenaire</th>
                    <th className="hidden md:table-cell">Processus / Motif</th>
                    <th className="hidden lg:table-cell">Agence</th>
                    <th>Statut</th>
                    <th className="hidden sm:table-cell">Échéance</th>
                    <th className="text-right">Action</th>
                </tr>
                </thead>
                <tbody>
                {tickets.map(ticket => {
                    const slaDays = getSlaDays(ticket)
                    return (
                    <tr
                        key={ticket.id}
                        className={clsx(
                            "cursor-pointer group transition-colors",
                            ticket.statut === 'a_valider' && user?.role === 'coordonnateur' && "bg-violet-50/50 hover:bg-violet-50",
                            ticket.statut === 'en_cours' && ticket.remarques_coordination && "bg-amber-50/40 border-l-4 border-l-amber-500 hover:bg-amber-50/80",
                            ticket.agence_origine_id === ticket.agence_id && ticket.pilote_escaladeur_id && "bg-violet-50/60 border-l-4 border-l-violet-600 hover:bg-violet-100/70"
                        )}
                        onClick={() => navigate(`/reclamations/${ticket.id}`)}
                    >
                        <td className="font-mono font-bold text-xs text-cnps-800">{ticket.numero_ticket}</td>
                        <td>
                            <div>
                                <p className="font-semibold text-slate-800 text-xs">
                                    {ticket.partenaire_nom_prenoms || ticket.partenaire_raison_sociale ? (
                                        <>
                                            {ticket.partenaire_nom_prenoms}
                                            {ticket.partenaire_nom_prenoms && ticket.partenaire_raison_sociale && ' / '}
                                            {ticket.partenaire_raison_sociale}
                                        </>
                                    ) : (
                                        ticket.partenaire_nom || 'Monsieur / Madame'
                                    )}
                                </p>
                                {ticket.statut === 'en_cours' && ticket.remarques_coordination && (
                                    <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded-lg p-2 max-w-sm font-medium animate-in fade-in duration-300">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-extrabold text-amber-900">Motif du retour :</span> {ticket.remarques_coordination}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-cnps-700 bg-cnps-50 px-1.5 py-0.5 rounded w-fit uppercase">
                                    {ticket.processus_code}
                                </span>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{ticket.motif_libelle}</p>
                            </div>
                        </td>
                        <td className="hidden lg:table-cell text-xs font-medium text-slate-600">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 text-[10px] tracking-wide uppercase">
                                        Active : {ticket.agence_code}
                                    </span>
                                </div>
                                {ticket.agence_origine_id !== ticket.agence_id ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-orange-400 px-2 py-0.5 rounded-full w-fit shadow-sm" title={`Agence d'origine : ${ticket.agence_origine_nom}`}>
                                        Origine : {ticket.agence_origine_nom || "Autre"}
                                    </span>
                                ) : (
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-full w-fit" title={`Agence d'origine : ${ticket.agence_origine_nom}`}>
                                        Origine : {ticket.agence_origine_nom || ticket.agence_code}
                                    </span>
                                )}
                                {ticket.agence_origine_id === ticket.agence_id && ticket.pilote_escaladeur_id && (
                                    <span className="text-[9px] text-violet-600 font-black uppercase bg-violet-100 border border-violet-200 rounded px-1.5 py-0.5 w-fit" title="Cette réclamation a été traitée par la structure cible et vous a été retournée.">
                                        Retour Escalade
                                    </span>
                                )}
                            </div>
                        </td>
                        <td>
                            <StatusBadge statut={ticket.statut} horsSlA={ticket.hors_sla} />
                        </td>
                        <td className="hidden sm:table-cell">
                            {slaDays !== null ? (
                                <div className={clsx(
                                    "flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full w-fit",
                                    slaDays < 0 ? "bg-red-50 text-red-600" : 
                                    slaDays <= 1 ? "bg-orange-50 text-orange-600 animate-pulse" : 
                                    "bg-slate-50 text-slate-500"
                                )}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {slaDays < 0 ? `+${Math.abs(slaDays)}j` : slaDays === 0 ? 'AUJOURD\'HUI' : `${slaDays}j`}
                                </div>
                            ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="text-right">
                            {ticket.statut === 'en_cours' && ticket.remarques_coordination && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black bg-red-600 text-white animate-pulse mr-2 uppercase tracking-tighter">
                                    <RotateCcw className="w-3 h-3" />
                                    À corriger
                                </span>
                            )}
                            {ticket.agence_origine_id === ticket.agence_id && ticket.pilote_escaladeur_id && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black bg-violet-600 text-white animate-pulse mr-2 uppercase tracking-tighter">
                                    Retour Escalade
                                </span>
                            )}
                             {ticket.statut === 'nouveau' && user?.role === 'pilote' && ticket.agence_id === user?.agence_id && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/reclamations/${ticket.id}`);
                                    }}
                                    className="mr-2 px-2 py-1 bg-cnps-100 text-cnps-800 text-[10px] font-bold rounded hover:bg-cnps-200 transition-colors uppercase"
                                >
                                    <span className="hidden sm:inline">Prendre en charge</span>
                                    <span className="sm:hidden">Traiter</span>
                                </button>
                             )}
                            <button className="p-2 text-slate-300 group-hover:text-cnps-800 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    )
                })}
                </tbody>
            </table>
            {tickets.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucune réclamation trouvée</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

