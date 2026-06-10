"use client"

import React from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CreditCard, FileText, LayoutDashboard, Loader2, TrendingUp } from 'lucide-react';
import { useObtenerMetricas } from '@/hooks/useMetricas';
import { CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, BarChart, Bar} from 'recharts';

export default function DashboardResumenPage(){
    const { data: metricas, isLoading } = useObtenerMetricas();

    if (isLoading || !metricas) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4"/>
                <p className="font-medium text-sm animate-pulse"> Cargando métricas... </p>
                
            </div>  
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-indigo-600"/>
                    Resumen General
                </h1>
                <p className="text-gray-500 mt-1">Métricas y KPIs de la pasarela de pagos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* metrica volumen*/}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-indigo-600"/>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Volumen Diario de Transacciones</p>
                        <h3 className="text-2xl font-bold text-gray-900">${metricas.kpiResumen.volumenTransDiario.toLocaleString('es-CL')}
                            <span className="text-sm text-gray-400 font-medium"> trans</span>
                        </h3>
                        <p className="text-xs text-emerald-600 font-bold mt-1">
                            {metricas.kpiResumen.crecimientoVolumen}% de variación respecto al día anterior
                        </p>
                    </div>
                </div>

                {/* metrica rechazo*/}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-600"/>
                    </div>

                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider"> Tasa de Rechazo</p>
                        <h3 className="text-2xl font-bold text-gray-900">{metricas.kpiResumen.tasaRechazo}%</h3>
                        <p className="text-xs text-emerald-600 font-bold mt-1"> optimo (objetivo &lt;0.5%)</p>
                    </div>
                </div>

                {/* metrica sla*/}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-6 h-6 text-emerald-600"/>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider"> Uptime SLA </p>
                        <h3 className="text-2xl font-black text-gray-900">{metricas.kpiResumen.uptimeSLA}%</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6">
                        Flujo de transacciones del dia 
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metricas.transaccionesDiarias} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke = "#f1f5f9"/>
                                <XAxis dataKey="hora" axisLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                <Legend wrapperStyle={{ paddingTop: '20px'}}/>
                                <Line type="monotone" name="aprobadas" dataKey="exitosas" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" name="rechazadas" dataKey="rechazadas" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>  
                </div>


                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-500"/>
                        Volumen por método de pago
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metricas.volumenPorMetodo} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke = "#f1f5f9"/>
                                <XAxis type="number" hide />
                                <YAxis dataKey="metodo" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={110}/>
                                <Tooltip
                                    formatter={(value: any) => `$${value.toLocaleString('es-CL')}`}
                                    cursor={{ fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                />
                                <Bar dataKey="volumenTrans" name="Volumen Transacciones" fill="#4f46e5" barSize={24} radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    
                    </div>


                </div>
                <div>

                </div>

            </div>

            <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
                        <FileText className="w-6 h-6 text-white"/>
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-indigo-900">Modulo de reporteria y analitica</h3>
                    </div>
                </div>

                <Link
                    href="/dashboard/reportes"
                    className="flex-shrink-0 bg-white text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100 border border-indigo-200 px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                    Ir a reportes <ArrowRight className="w-4 h-4"/>
                </Link>

            </div>

        </div>
    )
}