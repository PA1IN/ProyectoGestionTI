/*import { NextResponse, NextRequest } from "next/server";

const rutasProtegidas = ["/dashboard"];

export function middleware(request: NextRequest) {

    // token de autenticación obtenido de las cookies
    const authToken = request.cookies.get("token")?.value;
    const { pathname, searchParams } = request.nextUrl;


    // logica para dashboard (operadores financieros)
    if (authToken && pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const rutaProtegida = rutasProtegidas.some((ruta) => pathname.startsWith(ruta));

    if (!authToken && rutaProtegida) {
        return NextResponse.redirect(new URL("/login", request.url));
    }


    // logica para pasarela de pago (usuarios finales)
    if (pathname.startsWith("/checkout")) {
        //en caso de usar query params
        //const tokenTransaccion = searchParams.get("token");
        
        //en caso de usar rutas dinámicas
        const urlPartes = pathname.split("/");
        const tokenTransaccion = urlPartes[urlPartes.length - 1];

        // si no hay un token de transaccion valido o si intentan acceder a checkout sin token
        if (!tokenTransaccion || tokenTransaccion === "checkout") {
            // si no hay un token de transaccion valido, se redirige a una pagina de error
           /* return NextResponse.redirect(new URL("/error-pago", request.url));
        }

  /*  }

    return NextResponse.next();

}

export const config = {
    matcher: ["/dashboard/:path*","/login","/checkout/:path*"]
}*/