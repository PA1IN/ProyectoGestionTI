import React from 'react';
import { ArrowRight, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      
      <nav className="w-full bg-white border-b border-gray-100 flex items-center justify-between px-8 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">PasarelaDePagos<span className="text-indigo-600">.</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
            Portal Operadores
          </Link>
          <Link href="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Ingresar al Panel
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Proyecto de Gestión TI
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
            Pasarela de pagos <br className="hidden md:block"/>
          </h1>
  
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/checkout/demo-token-12345" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              Simular un Pago <ArrowRight className="w-5 h-5" />
            </Link>
            
          </div>
        </div>
      </main>


¿      <footer className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <span className="text-lg font-black text-white tracking-tight">PasarelaDePagos<span className="text-indigo-500">.</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Proyecto Integrador Gestión TI 
          </p>
        </div>
      </footer>
    </div>
  );
}
