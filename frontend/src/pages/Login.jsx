import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      <main className="flex-grow flex flex-col md:flex-row">
        {/* Left Side: Login Form */}
        <section className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center px-6 md:px-10 py-10 bg-white">
          <div className="max-w-md w-full mx-auto">
            <header className="mb-10 text-center flex flex-col items-center">
              <img alt="Logo CNPS" className="h-20 w-auto mb-6" src="/logo-cnps.png" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">eRéclamations</h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Plateforme centralisée de gestion des réclamations de la Caisse Nationale de Prévoyance Sociale. Connectez-vous pour traiter vos dossiers.
              </p>
              <div className="mt-6 w-full">
                <a 
                  href="/suivi" 
                  className="inline-flex items-center justify-center gap-2 w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-cnps-800" />
                  Vous êtes un client ? Suivre mon dossier
                </a>
              </div>
            </header>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider" htmlFor="email">
                  Email professionnel
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-cnps-800 focus:border-cnps-800 transition-all duration-150"
                    placeholder="vous@cnps.ci"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider" htmlFor="password">
                    Mot de passe
                  </label>
                  <a className="text-xs font-semibold text-cnps-800 hover:underline transition-all" href="#">
                    Mot de passe oublié ?
                  </a>
                </div>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-cnps-800 focus:border-cnps-800 transition-all duration-150 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-cnps-800 border-slate-300 rounded focus:ring-cnps-800"
                />
                <label className="ml-2 text-sm text-slate-600 cursor-pointer" htmlFor="remember-me">
                  Rester connecté
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cnps-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl hover:bg-cnps-900 active:opacity-80 transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : 'Se connecter'}
              </button>
            </form>

            {/* Comptes de démo */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Comptes de démonstration :</p>
              <div className="space-y-2 text-xs text-slate-500">
                {[
                  { email: 'superviseur@cnps.ci',    role: 'Superviseur (Centrale)' },
                  { email: 'coord.plateau@cnps.ci',  role: 'Manager de service' },
                  { email: 'pilote.plateau@cnps.ci', role: 'Pilote' },
                  { email: 'agent.plateau@cnps.ci',  role: 'Agent' },
                ].map(({ email, role }) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => setForm({ email, password: 'Password@1234' })}
                    className="flex items-center gap-2 w-full text-left hover:text-cnps-800 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0" />
                    <span className="font-medium">{role}</span>
                    <span className="text-slate-400">— {email}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Besoin d'assistance ? <a className="text-cnps-800 font-semibold hover:underline" href="#">Contacter le support IT</a>
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Visual Panel */}
        <section className="hidden md:flex flex-grow relative overflow-hidden bg-cnps-800">
          <div className="absolute top-0 left-0 right-0 p-8 z-20 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl p-2 shadow-sm">
                 <img alt="Logo CNPS" className="w-12 h-14 object-contain" src="/logo-cnps.png" />
              </div>
              <div className="text-white text-left">
                <div className="font-bold text-lg leading-tight uppercase tracking-wide">Caisse Nationale de Prévoyance Sociale</div>
                <div className="text-sm opacity-90">de Côte d'Ivoire</div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 z-0">
            <img
              alt="Retired Ivorian couple smiling while reviewing documents at a CNPS office."
              className="w-full h-full object-cover opacity-100"
              src="/bg_image.png"
            />
          </div>
          <div className="relative z-10 w-full flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-xl bg-black/30 p-8 rounded-2xl backdrop-blur-sm border border-white/10 shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Assurer un avenir serein à chaque citoyen.</h2>
              <p className="text-base text-blue-100 max-w-sm mx-auto">Gérez les dossiers avec bienveillance et efficacité pour garantir la satisfaction de nos assurés.</p>
            </div>
          </div>
          {/* Decorative Grain Texture Overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-4 w-full mx-auto gap-4">
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} CNPS Côte d'Ivoire. Usage strictement interne.
          </div>
          <div className="flex items-center gap-6">
            <a className="text-xs text-slate-500 hover:text-slate-800 transition-colors" href="#">Politique de confidentialité</a>
            <a className="text-xs text-slate-500 hover:text-slate-800 transition-colors" href="#">Conditions d'utilisation</a>
            <a className="text-xs text-slate-500 hover:text-slate-800 transition-colors" href="#">Sécurité</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
