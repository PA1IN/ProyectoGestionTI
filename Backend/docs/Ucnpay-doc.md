# Integracion pasarela UCNPAY

Para transacciones normales no periodicas (no suscripciones):
Usuario hace clic en pagar -> se redirige a nuestra pasarela (formulario) -> ingresa datos y paga -> se aprueba o rechaza -> el usuario es devuelto al comercio inicial.

Para transacciones periodicas (a nivel de backend):
Se envia la tarjeta de usuario a la api -> se retorna el token -> se utiliza el token para hacer el pago.

En el caso de las suscripciones, una vez con el token, se pueden hacer pagos sin la necesidad de que el usuario ingrese al formulario.

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

Respuesta:
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

Respuesta:
```json
{
  "token": "jwt_o_token_checkout",
  "comercio": "Mi Comercio",
  "montoTotal": 15000,
  "estado": "PENDIENTE",
  "urlRetorno": "https://frontend.com/retorno",
}
```


### Pagos periodicos (proyecto 10)

#### `POST /api/ucnpay/init/suscription`
Inicia el proceso para guardar una tarjeta y crea el mandato para pagos periodicos (MIT).

Headers:
- `x-private-key`

Body:
```json
{
  "userId": "uuid_usuario_de_tu_comercio",
  "tarjeta": {
    "numero": "1111222233334444",
    "exp_mes": "01",
    "exp_ano": "2027",
    "cvc": "123"
  },
  "titular": "Juan Perez"
}
```

Respuesta:
```json
{
  "status": "APROBADO",
  "message": "Tarjeta guardada correctamente",
  "paymentMethodToken": "token_para_pago_periodico",
  "mandateId": "uuid_mandato",
  "card": {
    "brand": "VISA",
    "last4": "4444",
    "expMonth": 1,
    "expYear": 2027,
    "holderName": "Juan Perez"
  }
}
```

#### `POST /api/ucnpay/suscription/authorize`
Autoriza un pago periodico.

Headers:
- `x-private-key`

Body:
```json
{
  "idOrden": "MIT-12345-010126",
  "monto": 9000,
  "moneda": "CLP",
  "paymentMethodToken": "uuid_tarjeta",
  "customer": "Juan Perez"
}
```

#### `DELETE /api/ucnpay/tarjeta`
Elimina una tarjeta guardada especifica.

Body:
```json
{
  "userId": "uuid_usuario",
  "token": "uuid_tarjeta"
}
```

### `GET /api/ucnpay/tarjeta/:userId`
Obtiene todas las tarjetas dado un id de usuario

Respuesta:
```json
[
  {
    "id": "e4b2d3a1-7c9f-4b1a-8c3d-2e1f0a9b8c7d",
    "last4": "4321",
    "brand": "Visa",
    "expMonth": 12,
    "expYear": 2029,
    "holderName": "Juan Perez"
  },
  {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "last4": "8888",
    "brand": "Mastercard",
    "expMonth": 5,
    "expYear": 2028,
    "holderName": "Juan Tapia"
  }
]
```

## Notas de integracion
- Una misma tarjeta puede estar guardada por distintos usuarios, pero no se puede repetir la misma tarjeta activa para el mismo usuario.

