# Integracion pasarela UCNPAY

Para transacciones normales no periodicas (no suscripciones):
Usuario hace clic en pagar -> se redirige a nuestra pasarela (formulario) -> ingresa datos y paga -> se aprueba o rechaza -> el usuario es devuelto al comercio inicial.
Idealmente, con la url de retorno (que es el frontend de su proyecto 3), esta tenga alguna consulta a su backend o del mismo frontend tambien hacian nuestra pasarela para ver el resultado de la transaccion.

## Url base
- `https://proyectogestionti.onrender.com/api`

## Autenticacion y headers

### Pasarela UCNPAY
Para utilizar la pasarela, se deben enviar headers con las credenciales que les otorgemos, así se validaran correctamente quien envia las peticiones. Se espera recibir la private key solamente ya que se asumio que la comunicacion es de server-to-server (o backend proyecto x con nuestro backend)

- `x-public-key`: clave publica del comercio
- `x-private-key`: clave privada del comercio

Importante:
- `x-private-key` Se debe enviar obligatoriamente para todos los endpoint.

### Pagos no periodicos (proyecto 3)

#### `POST /api/ucnpay/init`
Inicializa una transaccion común. (CIT)

Headers:
- `x-private-key`

Body:
```json
{
  "idOrden": "ORD-12345-230626",
  "monto": 15000,
  "moneda": "CLP",
  "nombreComercio": "Mi Comercio",
  "returnUrl": "https://tu-url-de-checkout/para/retornar"
}
```

Respuesta exito (201 Created):
```json
{
  "token": "jwt_o_token_checkout",
  "transactionUrl": "https://proyectogestionti.onrender.com/api/checkout/jwt_o_token_checkout",
  "transactionId": "uuid",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

#### `GET /api/ucnpay/checkout/:token`
Consulta el detalle de checkout de una transaccion.

Headers:
- Opcional

Respuesta exito (200 OK):
```json
{
  "token": "jwt_o_token_checkout",
  "comercio": "Mi Comercio",
  "montoTotal": 15000,
  "estado": "PENDIENTE",
  "urlRetorno": "https://frontend.com/retorno",
}
```

Respuesta fallo (401 Unauthorized):

```json
{
  "message": "Token inválido o expirado",
  "error": "Unauthorized",
  "statusCode": 401
}
```


## Peticiones de webhook
Peticiones que hace nuestra pasarela a su backend enviando la informacion de igual manera:
POST `https://tu-comercio/endpoint`

### Transacción aprobada

```json
{
  "event": "transaction.approved",
  "transactionId": "trx_123",
  "idOrden": "ORD-001",
  "operationType": "CIT",
  "status": "APROBADO",
  "monto": 15000,
  "moneda": "CLP",
  "card": {
    "brand": "VISA",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028
  },
  "timestamp": "2026-06-24T18:00:00.000Z"
}
```

---

## Transacción rechazada

```json
{
  "event": "transaction.rejected",
  "transactionId": "trx_123",
  "idOrden": "ORD-001",
  "operationType": "CIT",
  "status": "RECHAZADO",
  "monto": 15000,
  "moneda": "CLP",
  "card": {
    "brand": "VISA",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028
  },
  "timestamp": "2026-06-24T18:00:00.000Z"
}
```

---

## Notas de integracion
- En caso de errores de tipos, red, falta de atributos arroja 400 Bad Request
- La id de orden la tienen que generar ustedes siendo unica, se utiliza para que no se repitan transacciones (idempotencia).