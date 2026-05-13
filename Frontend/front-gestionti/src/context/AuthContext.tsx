'use client';

import React, { createContext, useCallback, useContext, useMemo, useState} from "react";
import Cookies from "js-cookie";

interface TipoAutenticacion {
    token: string | null;
    setToken: (token: string | null) => void;
    rolUsuario: string | null;
    setRolUsuario: (rol: string | null) => void;
    loading: boolean;
    logout: () => void;
}

const contextoAutenticacion = createContext<TipoAutenticacion | undefined>(undefined);

//cookies
const TOKEN_COOKIE_KEY = 'pasarela_auth_token';
const ROL_COOKIE_KEY = 'pasarela_user_rol';

export const ProveedorAuth = ({ children }: { children: React.ReactNode }) => {
    const [token, setTokenState] = useState<string | null>(() => {
        // comprobacion para evitar errores en el servidor donde no existe el objeto window
        if (typeof window !== 'undefined') {
            return Cookies.get(TOKEN_COOKIE_KEY) || null;
        }
        return null;
    });
    const [rolUsuario, setRolUsuarioState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return Cookies.get(ROL_COOKIE_KEY) || null;
        }
        return null;
    });

    const [loading, setLoading] = useState(false);

    const setToken = useCallback((nuevoToken: string | null) => {
        setTokenState(nuevoToken);
        if (nuevoToken) {
            Cookies.set(TOKEN_COOKIE_KEY, nuevoToken, { expires: 1 }); // expira en 1 días
        } else {
            Cookies.remove(TOKEN_COOKIE_KEY);
        }
    }, []);

    const setRolUsuario = useCallback((nuevoRol: string | null) => {
        setRolUsuarioState(nuevoRol);
        if (nuevoRol) {
            Cookies.set(ROL_COOKIE_KEY, nuevoRol, { expires: 1 });
        } else {
            Cookies.remove(ROL_COOKIE_KEY);
            setRolUsuarioState(null);
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setRolUsuario(null);
    }, [setToken, setRolUsuario]);

    const valorContexto = useMemo(() => ({
        token,
        setToken,
        rolUsuario,
        setRolUsuario,
        loading,
        logout
    }), [token, setToken, rolUsuario, setRolUsuario, loading, logout])

    return (
        <contextoAutenticacion.Provider value={valorContexto}>
            {children}
        </contextoAutenticacion.Provider>  
    );
};

export const useAuth = (): TipoAutenticacion => {
    const contexto = useContext(contextoAutenticacion);
    if (!contexto)
    {
        throw new Error('el hook de useAuth debe ir dentro de un ProveedorAuth');
    }
    return contexto;
}

