/**
 * Utilitaires de gestion des rôles et permissions
 */

export const ROLES = {
  AGENT:         'agent',
  PILOTE:        'pilote',
  COORDONNATEUR: 'coordonnateur',
  SUPERVISEUR:   'superviseur',
}

export const ROLE_LABELS = {
  agent:         'Agent de guichet',
  pilote:        'Pilote',
  coordonnateur: 'Manager de service/section accueil réclamations',
  superviseur:   'Superviseur',
}

export const STATUTS = {
  NOUVEAU:    'nouveau',
  EN_COURS:   'en_cours',
  A_VALIDER:  'a_valider',
  RESOLU:     'resolu',
  REJETE:     'rejete',
}

export const STATUT_LABELS = {
  nouveau:    'Nouveau',
  en_cours:   'En cours',
  a_valider:  'À Valider',
  resolu:     'Résolu',
  rejete:     'Rejeté',
}

/**
 * Vérifie si un utilisateur peut effectuer une action sur une réclamation
 */
export function canPerformAction(user, action, reclamation = null) {
  if (!user) return false

  switch (action) {
    case 'create':
      return true // tous les rôles peuvent créer

    case 'view':
      if (user.role === 'superviseur') return true
      if (user.role === 'agent') return reclamation?.agent_createur_id === user.id
      return reclamation?.agence_id === user.agence_id

    case 'prendre_en_charge':
      return user.role === 'pilote'
        && reclamation?.statut === 'nouveau'
        && reclamation?.agence_id === user.agence_id

    case 'add_action':
      return (user.role === 'pilote' || user.role === 'superviseur')
        && ['nouveau', 'en_cours'].includes(reclamation?.statut)

    case 'soumettre':
      return user.role === 'pilote'
        && ['nouveau', 'en_cours'].includes(reclamation?.statut)
        && reclamation?.agence_id === user.agence_id

    case 'valider':
    case 'retourner':
      return (user.role === 'coordonnateur' || user.role === 'superviseur')
        && reclamation?.statut === 'a_valider'
        && (user.role === 'superviseur' || reclamation?.agence_id === user.agence_id)

    case 'admin':
      return user.role === 'superviseur' || user.role === 'coordonnateur'

    default:
      return false
  }
}

/**
 * Formate un nom complet
 */
export function fullName(prenom, nom) {
  return `${prenom || ''} ${nom || ''}`.trim()
}

/**
 * Calcule le nombre de jours restants avant l'échéance SLA
 */
export function slaDaysLeft(dateEcheance) {
  const diff = new Date(dateEcheance) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
