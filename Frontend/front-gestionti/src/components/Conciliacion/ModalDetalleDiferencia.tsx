import React from 'react';
import { X, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, Building2, Server, Loader2, BanknoteArrowUp, Building2Icon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DetalleDiscrepancia, useCerrarDiscrepancia, useDiscrepanciaPorRrn } from '@/hooks/useConciliacion';
import { useAuth } from '@/context/AuthContext';

interface ModalProps { 
    abierto: boolean;
    cerrado: () => void;
    rrn: number | null;
    onDiscrepanciaCerrada?: (discrepancia: DetalleDiscrepancia) => void;
}

export const ModalDetalleDiferencia = ({ abierto, cerrado, rrn, onDiscrepanciaCerrada }: ModalProps) => {
    const queryClient = useQueryClient();
    const { usuario } = useAuth();
    const { data: detalle, isLoading } = useDiscrepanciaPorRrn(abierto ? rrn : null);
    const cerrarDiscrepancia = useCerrarDiscrepancia();

    if (!abierto) return null;

    const tipo = detalle?.tipo;

    const bancoExiste = tipo === 'FALTANTE_EN_BANCO' || tipo === 'DIFERENCIA_DE_MONTO';
    const internoExiste = tipo === 'EXISTE_EN_BANCO' || tipo === 'DIFERENCIA_DE_MONTO';

    const getEstadoBadge = (existe: boolean, resaltado: 'success' | 'danger' | 'warning' = 'warning') => {
        if (existe) {
            return {
                label: 'Existe',
                className: resaltado === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-100 text-sky-700',
            };
        }

        return {
            label: 'No existe',
            className: 'bg-rose-100 text-rose-700',
        };
    };

    const tarjetaBanco = getEstadoBadge(bancoExiste, tipo === 'EXISTE_EN_BANCO' ? 'success' : 'warning');
    const tarjetaInterno = getEstadoBadge(internoExiste, tipo === 'FALTANTE_EN_BANCO' ? 'success' : 'warning');

    const handleCerrar = async () => {
        if (rrn === null) {
            return;
        }

        const discrepanciaActualizada = await cerrarDiscrepancia.mutateAsync({
            rrn,
            payload: {
                estado: 'CERRADA',
                resuelto_por: usuario ?? 'a',
            },
        });

        onDiscrepanciaCerrada?.(discrepanciaActualizada);
        queryClient.setQueryData(['discrepancia', rrn], discrepanciaActualizada);
        cerrado();
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                    <p className="mt-4 text-sm text-slate-600">Cargando detalle de la discrepancia...</p>
                </div>
            </div>
        );
    }

    if (!detalle) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                <div className="bg-slate-950 p-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            <div>
                                <h2 className="text-xl font-bold leading-tight">Revisión de Inconsistencia</h2>
                                <p className="mt-1 text-sm text-slate-300">ID Transacción: {detalle.rrn}</p>
                            </div>
                        </div>

                        <button
                            onClick={cerrado}
                            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-5">
                    <div className="flex flex-col md:flex-row items-stretch gap-4 relative">
                        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                <h3 className="text-sm font-bold text-slate-700">Registro Bancario</h3>
                            </div>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Monto reportado</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {detalle.monto_banco !== null ? `$${Number(detalle.monto_banco).toLocaleString('es-CL')}` : '-'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</p>
                                    <span className={`mt-1 inline-flex rounded-md px-3 py-1 text-sm font-bold ${tarjetaBanco.className}`}>
                                        {tarjetaBanco.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center justify-center w-12 shrink-0">
                            <div className="rounded-full border border-slate-200 bg-slate-100 p-2 shadow-inner">
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex-1 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm ring-1 ring-sky-50">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Server className="w-5 h-5 text-sky-500" />
                                <h3 className="text-sm font-bold text-slate-700">Registro Interno (Flujo de pago)</h3>
                            </div>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Monto esperado</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {detalle.monto_interno !== null ? `$${Number(detalle.monto_interno).toLocaleString('es-CL')}` : '-'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</p>
                                    <span className={`mt-1 inline-flex rounded-md px-3 py-1 text-sm font-bold ${tarjetaInterno.className}`}>
                                        {tarjetaInterno.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                        onClick={cerrado}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCerrar}
                        disabled={cerrarDiscrepancia.isPending}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        <ShieldAlert className="w-4 h-4"/>
                        {cerrarDiscrepancia.isPending ? 'Cerrando...' : 'Cerrar y confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}