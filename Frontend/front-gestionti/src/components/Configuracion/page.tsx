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
        const [reintentosActivos, setReintentosActivos] = useState(true);
        const [maxIntentos, setMaxIntentos] = useState(3);
        const [intervalo, setIntervalo] = useState(5);
        const [guardado, setGuardado] = useState(false);
    
    //tipos de errores que pueden aplican un reintento
    const [erroresAplicables, setErroresAplicables] = useState({
        timout: true,
        fondosInsuficientes: false,
        fallaRed: true,
        rechazoBanco: false
    });

    const handleGuardar = async (e: SyntheticEvent) => {
        e.preventDefault();

        console.log("guardando configuracion:", { reintentosActivos, maxIntentos, intervalo, erroresAplicables});

        try { 
            await guardarConfiguracion.mutateAsync({
                reintentosActivos,
                maxIntentos,
                intervalo,
                erroresAplicables
            });
            setGuardado(true);
            setTimeout(() => setGuardado(false), 3000);
        } catch (err) {
            console.error("error al guardar la config", err);
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

                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                        <h3 className="font-bold text-gray-900">Activar reintentos automáticos</h3>
                        <p className="text-sm text-gray-500">Permite que el sistema intente cobrar nuevamente si el banco falla por problemas técnicos.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={reintentosActivos}
                            onChange={(e) => setReintentosActivos(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!reintentosActivos ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Máximo de intentos</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxIntentos}
                            onChange={(e) => setMaxIntentos(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Intervalo de espera /segundos</label>
                        <input
                            type="number"
                            min="1"
                            value={intervalo}
                            onChange={(e) => setIntervalo(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        /> 
                    </div>
                </div>

                <div className={`pt-2 ${!reintentosActivos ? 'opacity-40 pointer-events-none' : ''}`}>
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

                    <div className="mt-4 flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"/>
                        <p className="text-xs text-blue-800">
                            Errores por &apos;Fondos insuficintes&apos; o &apos;Tarjeta bloqueada&apos; no deben ser reintentados automaticamente para evitar colapsar el sistema del banco.
                        </p>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        {guardado ? <CheckCircle2 className="w-5 h-5"/> : <Save className="w-5 h-5"/>}
                        {guardado ? 'Configuración guardada' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
    );




}