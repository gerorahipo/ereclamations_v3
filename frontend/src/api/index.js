// ── Client API centralisé avec JWT auto-injecté ─────────────

const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('ereclamations_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const activeAgencyId = localStorage.getItem('ereclamations_active_agence_id')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeAgencyId ? { 'X-Active-Agency': activeAgencyId } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('ereclamations_token')
    window.location.href = '/login'
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
  return data
}

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login:          (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me:             ()     => request('/auth/me'),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
}

// ─── Réclamations ─────────────────────────────────────────────
export const reclamationsApi = {
  list:         (params = {}) => request('/reclamations?' + new URLSearchParams(params)),
  history:      (identifiant) => request(`/reclamations/history?identifiant=${encodeURIComponent(identifiant)}`),
  get:          (id)          => request(`/reclamations/${id}`),
  create:       (body)        => request('/reclamations', { method: 'POST', body: JSON.stringify(body) }),
  updateStatut: (id, body)    => request(`/reclamations/${id}/statut`, { method: 'PUT', body: JSON.stringify(body) }),
  soumettre:    (id)          => request(`/reclamations/${id}/soumettre`, { method: 'POST', body: JSON.stringify({}) }),
  valider:      (id, body)    => request(`/reclamations/${id}/valider`, { method: 'POST', body: JSON.stringify(body) }),
  retourner:    (id, body)    => request(`/reclamations/${id}/retourner`, { method: 'POST', body: JSON.stringify(body) }),
  updateAnalyse: (id, body)   => request(`/reclamations/${id}/analyse`, { method: 'PUT', body: JSON.stringify(body) }),
  updateRemarques: (id, body)  => request(`/reclamations/${id}/remarques`, { method: 'PUT', body: JSON.stringify(body) }),
  escalader: (id, body)      => request(`/reclamations/${id}/escalader`, { method: 'PUT', body: JSON.stringify(body) }),
  qualify: (id, body)        => request(`/reclamations/${id}/qualify`, { method: 'PUT', body: JSON.stringify(body) }),
}

// ─── Actions de traitement ────────────────────────────────────
export const actionsApi = {
  list:   (recId)        => request(`/reclamations/${recId}/actions`),
  create: (recId, body)  => request(`/reclamations/${recId}/actions`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body)     => request(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id)           => request(`/actions/${id}`, { method: 'DELETE' }),
}

// ─── Paramétrage ──────────────────────────────────────────────
export const parametrageApi = {
  regimes:      ()         => request('/regimes'),
  saveRegime:   (body)     => request('/regimes', { method: 'POST', body: JSON.stringify(body) }),
  updateRegime: (id, body)   => request(`/regimes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  typesClients: (params)   => request('/types-clients?' + new URLSearchParams(params || {})),
  saveTypeClient:(body)    => request('/types-clients', { method: 'POST', body: JSON.stringify(body) }),
  updateTypeClient:(id, body)=> request(`/types-clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  modesSaisine: ()         => request('/modes-saisine'),
  saveModeSaisine: (body)   => request('/modes-saisine', { method: 'POST', body: JSON.stringify(body) }),
  updateModeSaisine: (id, body) => request(`/modes-saisine/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  processus:    ()         => request('/processus'),
  saveProcessus:(body)     => request('/processus', { method: 'POST', body: JSON.stringify(body) }),
  updateProcessus:(id, body)=> request(`/processus/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  motifs:       (params)   => request('/motifs?' + new URLSearchParams(params || {})),
  saveMotif:    (body)     => request('/motifs', { method: 'POST', body: JSON.stringify(body) }),
  updateMotif:  (id, body)   => request(`/motifs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  sousMotifs:   (params)   => request('/sous-motifs?' + new URLSearchParams(params || {})),
  saveSousMotif: (body)     => request('/sous-motifs', { method: 'POST', body: JSON.stringify(body) }),
  updateSousMotif: (id, body) => request(`/sous-motifs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  categoriesCauses: (params) => request('/categories-causes?' + new URLSearchParams(params || {})),
  saveCategoryCause: (body)  => request('/categories-causes', { method: 'POST', body: JSON.stringify(body) }),
  updateCategoryCause: (id, body) => request(`/categories-causes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  causes:       (params)     => request('/causes?' + new URLSearchParams(params || {})),
  saveCause:    (body)       => request('/causes', { method: 'POST', body: JSON.stringify(body) }),
  updateCause:  (id, body)   => request(`/causes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  importCauses: (formData)   => {
    const token = getToken()
    return fetch('/api/causes/import', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    }).then(res => res.json())
  },
  bulkCauses: (data) => request('/causes/bulk', { method: 'POST', body: JSON.stringify(data) }),
  bulkMotifs: (data) => request('/motifs/bulk', { method: 'POST', body: JSON.stringify(data) }),
  bulkRessources: (data) => request('/ressources/bulk', { method: 'POST', body: JSON.stringify(data) }),
  affectations: ()         => request('/affectations'),
  saveAffectation:(body)   => request('/affectations', { method: 'POST', body: JSON.stringify(body) }),
  agences:      ()         => request('/agences'),
  saveAgence:   (body)     => request('/agences', { method: 'POST', body: JSON.stringify(body) }),
  updateAgence: (id, body)   => request(`/agences/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  ressources:   (params)   => request('/ressources?' + new URLSearchParams(params || {})),
  utilisateurs: (params)   => request('/utilisateurs?' + new URLSearchParams(params || {})),
  saveUtilisateur:(body)   => request('/utilisateurs', { method: 'POST', body: JSON.stringify(body) }),
  updateUtilisateur:(id, body) => request(`/utilisateurs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  stats:        ()         => request('/stats'),
  saveRessource: (body)     => request('/ressources', { method: 'POST', body: JSON.stringify(body) }),
  updateRessource: (id, body) => request(`/ressources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEntity: (entity, id) => request(`/${entity}/${id}`, { method: 'DELETE' }),
  
  importTravailleurs: (data) => request('/travailleurs/bulk', { method: 'POST', body: JSON.stringify(data) }),
  importEmployeurs:   (data) => request('/employeurs/bulk',   { method: 'POST', body: JSON.stringify(data) }),
  importSinistres:    (data) => request('/sinistres/bulk',    { method: 'POST', body: JSON.stringify(data) }),

  travailleurs: (params) => request('/travailleurs?' + new URLSearchParams(params || {})),
  employeurs:   (params) => request('/employeurs?'   + new URLSearchParams(params || {})),
  sinistres:    (params) => request('/sinistres?'    + new URLSearchParams(params || {})),

  saveTravailleur: (body) => request('/travailleurs', { method: 'POST', body: JSON.stringify(body) }),
  saveEmployeur:   (body) => request('/employeurs',   { method: 'POST', body: JSON.stringify(body) }),
  saveSinistre:    (body) => request('/sinistres',    { method: 'POST', body: JSON.stringify(body) }),

  updateTravailleur: (id, body) => request(`/travailleurs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateEmployeur:   (id, body) => request(`/employeurs/${id}`,   { method: 'PUT', body: JSON.stringify(body) }),
  updateSinistre:    (id, body) => request(`/sinistres/${id}`,    { method: 'PUT', body: JSON.stringify(body) }),

  clearTravailleurs: () => request('/travailleurs/clear', { method: 'DELETE' }),
  clearEmployeurs:   () => request('/employeurs/clear', { method: 'DELETE' }),
  clearSinistres:    () => request('/sinistres/clear', { method: 'DELETE' }),
  clearRessourcesNoAccount: () => request('/ressources/clear-no-account', { method: 'DELETE' }),

  // Intérims
  interims: () => request('/interims'),
  saveInterim: (body) => request('/interims', { method: 'POST', body: JSON.stringify(body) }),
  toggleInterim: (id) => request(`/interims/${id}/toggle`, { method: 'PATCH' }),
  audit: (params) => request('/audit?' + new URLSearchParams(params || {})),
  analytics: () => request('/analytics'),
}

// ─── Pièces Jointes ──────────────────────────────────────────
export const attachmentsApi = {
  list:   (recId)    => request(`/reclamations/${recId}/attachments`),
  upload: (recId, formData) => {
    const token = getToken()
    return fetch(`/api/reclamations/${recId}/attachments`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    }).then(res => res.json())
  },
  delete: (id)       => request(`/attachments/${id}`, { method: 'DELETE' }),
  download: (id)     => `${API_BASE}/attachments/${id}?token=${getToken()}`,
}

// ─── Base de connaissances (Suggestions) ──────────────────────
export const knowledgeBaseApi = {
  list:           (params) => request('/suggestions?' + new URLSearchParams(params || {})),
  getForTicket:   (recId)  => request(`/reclamations/${recId}/suggestions`),
  save:           (body)   => request('/suggestions', { method: 'POST', body: JSON.stringify(body) }),
  update:         (id, body) => request(`/suggestions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:         (id)     => request(`/suggestions/${id}`, { method: 'DELETE' }),
}

// ─── Base de connaissances Étendue (KB) ────────────────────────
export const kbApi = {
  list:   (params) => request('/kb?' + new URLSearchParams(params || {})),
  save:   (body)   => request('/kb', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/kb/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id)     => request(`/kb/${id}`, { method: 'DELETE' }),
}

// ─── Suivi Client ───────────────────────────────────────
export const publicApi = {
  track:        (numero) => request(`/public/tracking/${numero}`),
  init:         ()       => request('/public/init'),
  declare:      (formData) => {
    return fetch(`${API_BASE}/public/declare`, {
      method: 'POST',
      body: formData
    }).then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur de soumission')
      return data
    })
  },
  typesClients: (params) => request('/public/types-clients?' + new URLSearchParams(params || {})),
  motifs:       (params) => request('/public/motifs?' + new URLSearchParams(params || {})),
  sousMotifs:   (params) => request('/public/sous-motifs?' + new URLSearchParams(params || {})),
  checkIdentifier: (id, typeId) => request(`/public/check-identifier?id=${id}&type_client_id=${typeId}`),
}

export const mailApi = {
  get:  ()     => request('/config-mail'),
  save: (body) => request('/config-mail', { method: 'POST', body: JSON.stringify(body) }),
  test: (body) => request('/config-mail/test', { method: 'POST', body: JSON.stringify(body) }),
}

