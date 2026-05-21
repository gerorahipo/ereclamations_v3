import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  Users, 
  Search, 
  ArrowRight,
  TrendingUp,
  Zap,
  LayoutDashboard,
  Bell,
  Navigation2,
  FileText,
  Mail,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Infographie = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <header className="relative bg-gradient-to-br from-cnps-900 via-cnps-800 to-cnps-700 py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-10 w-96 h-96 bg-cnps-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-6 backdrop-blur-sm border border-white/20">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span>Nouvelle Version 2026</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            eRéclamations <span className="text-cnps-200">CNPS</span>
          </h1>
          <p className="text-xl text-cnps-50 max-w-3xl mx-auto mb-10 leading-relaxed">
            Une plateforme complète pour centraliser le pilotage des réclamations, automatiser les notifications, offrir un portail de suivi aux partenaires et générer vos courriers officiels en un clic.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="px-8 py-4 bg-white text-cnps-800 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              Voir la Démo
            </Link>
            <button className="px-8 py-4 bg-cnps-700/50 text-white font-bold rounded-xl border border-white/20 backdrop-blur-md hover:bg-cnps-600/50 transition-all duration-300">
              En savoir plus
            </button>
          </div>
        </div>
      </header>

      {/* ─── Key Features ───────────────────────────────────────── */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Fonctionnalités Puissantes</h2>
          <p className="text-slate-600 max-w-xl mx-auto">Conçu pour simplifier chaque étape du traitement des réclamations.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Globe className="w-8 h-8 text-indigo-600" />,
              title: "Portail Client (Suivi)",
              desc: "Les partenaires peuvent désormais suivre l'avancement de leurs dossiers en ligne 24h/24 via leur numéro de ticket."
            },
            {
              icon: <Mail className="w-8 h-8 text-blue-500" />,
              title: "Alertes Emails",
              desc: "Notifications automatiques aux pilotes lors de l'assignation et rappels d'échéance SLA pour éviter les retards."
            },
            {
              icon: <FileText className="w-8 h-8 text-emerald-500" />,
              title: "Génération de Courriers",
              desc: "Édition automatique d'accusés de réception et de lettres de réponse officielles en format PDF prêt à l'emploi."
            },
            {
              icon: <LayoutDashboard className="w-8 h-8 text-cnps-600" />,
              title: "Gestion Multi-Agence",
              desc: "Unification de toutes les agences de prévoyance sociale sur une seule plateforme de pilotage centralisée."
            },
            {
              icon: <Clock className="w-8 h-8 text-orange-500" />,
              title: "Suivi SLA Dynamique",
              desc: "Calcul automatique des délais de traitement avec un code couleur intuitif pour identifier les urgences."
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-cnps-800" />,
              title: "Audit & Transparence",
              desc: "Historique complet et inaltérable de chaque interaction pour garantir la traçabilité des décisions."
            }
          ].map((feature, i) => (
            <div key={i} className="group p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-cnps-100 transition-all duration-300">
              <div className="mb-4 bg-slate-50 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-cnps-50 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Workflow Visualizer ───────────────────────────────── */}
      <section className="bg-slate-900 py-24 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold mb-4">Parcours d'une Réclamation</h2>
            <p className="text-slate-400">Un processus fluide de l'accueil à la résolution.</p>
          </div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 hidden md:block"></div>
            
            {[
              { step: "Saisie", color: "bg-blue-500", label: "Nouveau" },
              { step: "Affectation", color: "bg-orange-500", label: "En cours" },
              { step: "Analyse", color: "bg-indigo-500", label: "Traitement" },
              { step: "Validation", color: "bg-violet-500", label: "Vérification" },
              { step: "Clôture", color: "bg-green-500", label: "Résolu" }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full ${step.color} flex items-center justify-center border-4 border-slate-900 shadow-2xl mb-4 group cursor-help`}>
                  <span className="font-bold text-lg">{i + 1}</span>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {step.label}
                  </div>
                </div>
                <p className="font-bold">{step.step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ──────────────────────────────────────────── */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-8 leading-tight">Pourquoi choisir <span className="text-cnps-800">eRéclamations</span> ?</h2>
            <div className="space-y-6">
              {[
                { title: "Réduction des délais de 40%", desc: "L'automatisation et le suivi SLA éliminent les temps morts dans le traitement.", icon: <TrendingUp className="text-green-500" /> },
                { title: "Transparence Totale", desc: "Le partenaire et l'administration peuvent suivre l'avancement en temps réel.", icon: <Users className="text-blue-500" /> },
                { title: "Décisions Basées sur la Donnée", icon: <BarChart3 className="text-purple-500" />, desc: "Analyses comparatives entre agences pour identifier les points d'amélioration." }
              ].map((benefit, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">{benefit.icon}</div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{benefit.title}</h4>
                    <p className="text-slate-600">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="bg-cnps-800 aspect-square rounded-3xl rotate-3 absolute inset-0 opacity-10"></div>
            <div className="bg-white p-6 rounded-3xl shadow-2xl relative border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-800">Performance Hebdomadaire</h3>
                <BarChart3 className="text-cnps-800 w-6 h-6" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cnps-600 w-3/4"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-1/2"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full"></div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4 text-cnps-800 font-bold">
                <span>98% Satisfaction Client</span>
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────────── */}
      <section className="bg-cnps-800 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Prêt pour la démonstration ?</h2>
          <Link to="/" className="inline-flex items-center gap-2 px-10 py-5 bg-white text-cnps-800 font-black rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
            Lancer l'Application <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 bg-white">
        &copy; 2026 CNPS Côte d'Ivoire - Direction du Système d'Information
      </footer>
    </div>
  );
};

export default Infographie;
