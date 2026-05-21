import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      setAlert({
        ...options,
        resolve
      });
    });
  }, []);

  const hideAlert = (value) => {
    if (alert?.resolve) alert.resolve(value);
    setAlert(null);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !alert.confirmOnly && hideAlert(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                alert.type === 'success' ? 'bg-green-50 text-green-500' :
                alert.type === 'error' ? 'bg-red-50 text-red-500' :
                alert.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                'bg-cnps-50 text-cnps-500'
              }`}>
                {alert.type === 'success' && <CheckCircle2 className="w-10 h-10" />}
                {alert.type === 'error' && <AlertCircle className="w-10 h-10" />}
                {alert.type === 'warning' && <AlertTriangle className="w-10 h-10" />}
                {(alert.type === 'info' || !alert.type) && <Info className="w-10 h-10" />}
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">
                {alert.title}
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                {alert.message}
              </p>

              <div className="flex gap-3 w-full">
                {alert.showCancel && (
                  <button
                    onClick={() => hideAlert(false)}
                    className="flex-1 py-4 px-6 rounded-2xl text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    {alert.cancelText || 'Annuler'}
                  </button>
                )}
                <button
                  onClick={() => hideAlert(true)}
                  className={`flex-1 py-4 px-6 rounded-2xl text-sm font-black text-white shadow-lg shadow-cnps-200 transition-all active:scale-95 ${
                    alert.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-100' :
                    alert.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' :
                    'bg-cnps-800 hover:bg-cnps-900'
                  }`}
                >
                  {alert.confirmText || 'D\'accord'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  
  const { showAlert } = context;

  return {
    success: (title, message) => showAlert({ type: 'success', title, message }),
    error: (title, message) => showAlert({ type: 'error', title, message }),
    warning: (title, message) => showAlert({ type: 'warning', title, message }),
    info: (title, message) => showAlert({ type: 'info', title, message }),
    confirm: (title, message, options = {}) => showAlert({ 
      type: 'warning', 
      title, 
      message, 
      showCancel: true, 
      confirmOnly: true,
      ...options 
    })
  };
}
