"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Menulateral } from '@/components/Dashboard/Menulateral';
import { TopBar } from '@/components/Dashboard/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { loading, autenticado, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!autenticado || !isAdmin)) {
            router.replace('/login');
        }
    }, [loading, autenticado, isAdmin, router]);

    if(loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!autenticado || !isAdmin) {
        return null;
    }



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