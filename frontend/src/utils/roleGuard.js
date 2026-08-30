/**
 * Utilitaires de gestion des rôles et permissions
 */

export const ROLES = {
  AGENT:         'agent',
  PILOTE:        'pilote',
  COORDONNATEUR: 'coordonnateur',
  MANAGER:       'manager',
  SUPERVISEUR:   'superviseur',
  ADMIN_FONCTIONNEL: 'administrateur_fonctionnel',
  ADMIN_SYSTEME:     'administrateur_systeme',
}

export const ROLE_LABELS = {
  agent:         'Agent accueil et relations client',
  pilote:        'Pilote',
  coordonnateur: 'Coordonnateur (structure centrale)',
  manager:       'Manager de service/section accueil réclamations',
  superviseur:   'Superviseur',
  administrateur_fonctionnel: 'Administrateur fonctionnel',
  administrateur_systeme:     'Administrateur système',
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
      if (['superviseur', 'coordonnateur', 'administrateur_fonctionnel', 'administrateur_systeme'].includes(user.role)) return true
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
      return (user.role === 'manager' || user.role === 'superviseur')
        && reclamation?.statut === 'a_valider'
        && (user.role === 'superviseur' || reclamation?.agence_id === user.agence_id)

    case 'admin':
      return ['superviseur', 'administrateur_fonctionnel', 'administrateur_systeme'].includes(user.role)

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
