"use client";

import React, { useState, SyntheticEvent } from 'react';
import { Save, RotateCcw, AlertCircle, CheckCircle2, Loader2} from 'lucide-react';
import { useGuardarConfiguracion, ConfiguracionReintentos } from '@/hooks/useConfiguracion';

interface FormConfiguracionProps {
    configInicial: ConfiguracionReintentos;
}

export const FormConfiguracion = ({ configInicial }: FormConfiguracionProps) => {
    
    const guardarConfiguracion = useGuardarConfiguracion();

    //estados para las reglas de los reintentos
        const [reintentosActivos, setReintentosActivos] = useState(configInicial.reintentosActivos);
        const [maxIntentos, setMaxIntentos] = useState<number | string>(configInicial.maxIntentos);
        const [intervalo, setIntervalo] = useState<number | string>(configInicial.intervalo);
        const [guardando, setGuardando] = useState(false);
        const [guardado, setGuardado] = useState(false);
    
    //tipos de errores que pueden aplican un reintento
    const [erroresAplicables, setErroresAplicables] = useState(configInicial.erroresAplicables);

    const handleGuardar = async (e: SyntheticEvent) => {
        e.preventDefault();
        setGuardando(true);

        console.log("guardando configuracion:", { reintentosActivos, maxIntentos, intervalo, erroresAplicables});

        try { 
            await guardarConfiguracion.mutateAsync({
                reintentosActivos,
                maxIntentos: Number(maxIntentos) || 1,
                intervalo: Number(intervalo) || 1,
                erroresAplicables
            });
            setGuardado(true);
            setTimeout(() => setGuardado(false), 3000);
        } catch (err) {
            console.error("error al guardar la config", err);
        } finally {
            setGuardando(false);
        }
        
    };

    const toggleError = (clave: keyof typeof erroresAplicables) => {
        setErroresAplicables(prev => ({ ...prev, [clave]: !prev[clave]}))
    }


    return (
            <form onSubmit={handleGuardar} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-indigo-500"/>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        Reglas de reintento automático (retry pattern)
                    </h2>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
                        <div>
                            <h3 className="font-bold text-gray-900">Activar reintentos automáticos</h3>
                            <p className="text-sm text-gray-500 mt-1">Permite que el sistema intente cobrar nuevamente si el banco falla por problemas técnicos.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={reintentosActivos}
                                onChange={(e) => setReintentosActivos(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!reintentosActivos ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Máximo de intentos</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxIntentos}
                            onChange={(e) => setMaxIntentos(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Intervalo de espera /segundos</label>
                        <input
                            type="number"
                            min="1"
                            value={intervalo}
                            onChange={(e) => setIntervalo(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        /> 
                    </div>
                </div>

                <div className={`transition-opacity duration-300 ${!reintentosActivos ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Causales válidas para reintento</label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={erroresAplicables.timout} onChange={() => toggleError('timout')} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                            <span className="text-sm font-medium text-gray-700">Timout del banco / Sin respuesta</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={erroresAplicables.rechazoBanco} onChange={() => toggleError('rechazoBanco')} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                            <span className="text-sm font-medium text-gray-700">Rechazo directo del banco</span>
                        </label>
                    </div>

                    <div className="mt-5 flex items-start gap-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"/>
                        <p className="text-sm text-blue-800">
                            Errores por &apos;Fondos insuficientes&apos; o &apos;Tarjeta bloqueada&apos; no deben ser reintentados automáticamente para evitar colapsar el sistema del banco.
                        </p>
                    </div>
                </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                <button
                    type="submit"
                    disabled={guardando}
                    className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2 ${guardando ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                    { guardando ? (<Loader2 className="w-5 h-5 animate-spin"/>) : guardado ? (<CheckCircle2 className="w-5 h-5"/>) : (<Save className="w-5 h-5"/>)}
                    {guardando ? 'Guardando...' : guardado ? 'Configuración guardada' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );




}