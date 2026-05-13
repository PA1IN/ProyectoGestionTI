"use client";

import React, { useEffect } from 'react';
import {useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, FileSpreadsheet, BellRing, BarChart3, LogOut, ShieldAlert, Settings } from 'lucide-react';
import { Menulateral } from '@/components/Dashboard/Menulateral';
import { TopBar } from '@/components/Dashboard/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { token, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    /*useEffect(() => {
        if(!loading && !token)
        {
            router.push('/login');
        }
    }, [token, loading, router]);*/

    if(loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    /*if(!token) {
        return null;
    }*/



    return(
        <div className="min-h-screen bg-gray-50 flex">
           <Menulateral/>
           <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopBar/>
                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
           </main>
        </div>   
    );
}