"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const [ error, setError] = useState('');
    const router = useRouter();

    const { token, rolUsuario, loading, iniciarSesion, autenticado, isAdmin } = useAuth();

    useEffect(() => {
        if (token && autenticado && isAdmin) {
            router.replace('/dashboard');
        }
    }, [token, autenticado, isAdmin, router]);

    const handleIngresar = async () => {
        setError('');
        try {
            await iniciarSesion();
        } catch (err) {
            console.error('Error iniciando sesión con Keycloak:', err);
            setError('No se pudo iniciar sesión con Keycloak');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-sm text-slate-600">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    if (autenticado && isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-8">
                    <div className="flex flex-col items-center mb-10">
                        <div className="bg-indigo-100 p-4 rounded-2xl mb-4">
                            <ShieldAlert className="w-10 h-10 text-indigo-600"/>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Admin</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-widest">Gestion TI</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex items-center gap-3 text-red-700 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <button
                            type="button"
                            onClick={handleIngresar}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Ingresar con Keycloak
                        </button>
                        <p className="text-xs text-gray-500 text-center">
                            Acceso exclusivo para usuarios con rol {rolUsuario ?? 'admin'}.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 p-5 text-center border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                        Sistema de Conciliación y Auditoría
                    </p>

                </div>

            </div>

        </div>
    )
}