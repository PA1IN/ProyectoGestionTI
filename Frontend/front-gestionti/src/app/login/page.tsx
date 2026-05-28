"use client";

import React, { useState, useEffect, SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/api/axios';
import { ShieldAlert, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ error, setError] = useState('');
    const [ botonVisible, setBotonVisible] = useState(false);

    const { setToken, setRolUsuario, token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (token) {
            router.push('/dashboard');
        }
    }, [token, router]);

    const handleSubmit = async (e: SyntheticEvent ) => {
        e.preventDefault();
        setError('');
        setBotonVisible(true);

        try {
            const respuesta = await api.post('/auth/login', { email, password });
            const { accessToken, rol } = respuesta.data;

            setToken(accessToken);
            setRolUsuario(rol);

            router.push('/dashboard');
        } catch (err: any) {
            console.error("Error en login:", err);
            setError('Credenciales incorrectas, porfavor verifique su correo y contraseña');
        } finally {
            setBotonVisible(false);
        }
    };

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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                                Correo Electronico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400"/>
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="operador@payflow.cl"
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400"/>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="********"
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={botonVisible}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {botonVisible ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin"/>
                                    Autenticando..
                                </>
                            ): (
                                "Ingresar al panel"
                            )}
                        </button>
                    </form>
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