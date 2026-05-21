import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const swResult = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker enregistré')
    },
    onRegisterError(error) {
      console.log('Erreur SW', error)
    },
  })

  const {
    offlineReady: [offlineReady, setOfflineReady] = [false, () => {}],
    needUpdate: [needUpdate, setNeedUpdate] = [false, () => {}],
    updateServiceWorker,
  } = swResult || {}

  const close = () => {
    if (setOfflineReady) setOfflineReady(false)
    if (setNeedUpdate) setNeedUpdate(false)
  }

  if (!offlineReady && !needUpdate) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-white border border-slate-200 rounded-lg shadow-xl animate-in slide-in-from-bottom-5">
      <div className="text-sm font-medium text-slate-900">
        {offlineReady ? (
          <span>L'application est prête à être utilisée hors ligne.</span>
        ) : (
          <span>Une nouvelle version est disponible !</span>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {needUpdate && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-cnps-600 rounded hover:bg-cnps-700 transition-colors"
          >
            Mettre à jour
          </button>
        )}
        <button
          onClick={() => close()}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

export default ReloadPrompt
