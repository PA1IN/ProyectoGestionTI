"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    FileSpreadsheet,
    BellRing,
    BarChart3,
    LogOut,
    ShieldAlert,
    Settings
} from 'lucide-react';

export const Menulateral = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    //menu de nav
    const menuItems = [
        { nombre: 'Resumen', ruta: '/dashboard', icono: LayoutDashboard},
        { nombre: 'Conciliación', ruta: '/dashboard/conciliacion', icono: FileSpreadsheet},
        { nombre: 'Alertas', ruta: '/dashboard/alertas', icono: BellRing},
        { nombre: 'Reportes', ruta: '/dashboard/reportes', icono: BarChart3},
        { nombre: 'Configuración', ruta: '/dashboard/configuracion', icono: Settings },
    ];

    return(
        <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <ShieldAlert className="w-8 h-8 text-indigo-400"/>
                <div>
                    <h1 className="font-bold text-lg leading-tight">Dashboard Admin</h1>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Gestión TI</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const Icono = item.icono;
                    const activo = pathname === item.ruta;
                    return (
                        <Link
                            key={item.ruta}
                            href={item.ruta}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activo
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <Icono className="w-5 h-5"/>
                            <span className="font-medium text-sm">{item.nombre}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-300 hover:bg-slate-800 hover:text-red-400 rounded-xl transition-all"
                >
                    <LogOut className="w-5 h-5"/>
                    <span className="font-medium text-sm">Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
};