# Integracion pasarela UCNPAY

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

Respuesta exito (200 ok): 

```json
{
  "status": "APROBADO",
  "message": "Suscripcion procesada correctamente",
  "transactionId": "uuid_transaccion",
  "paymentMethodToken": "token_para_pago_periodico",
  "mandateId": "uuid_mandato",
  "card": {
    "brand": "Visa",
    "last4": "4444",
    "expMonth": 1,
    "expYear": 2027
  },
  "customer": "Juan Perez"
}
```

Respuesta fallo por falta de mandato (200 ok):
```json
{
  "status": "RECHAZADO",
  "message": "No existe un mandato activo para este comercio",
  "transactionId": "uuid_nueva_transaccion_rechazada",
  "paymentMethodToken": "token_para_pago_periodico",
  "mandateId": null,
  "card": {
    "brand": "Visa",
    "last4": "4444",
    "expMonth": 1,
    "expYear": 2027
  },
  "customer": "Juan Perez"
}
```

Respueta fallo por saldo insuficiente (200 ok):

```json
{
  "status": "RECHAZADO",
  "message": "Saldo insuficiente",
  "transactionId": "unknown",
  "paymentMethodToken": "token_para_pago_periodico",
  "mandateId": null,
  "card": {
    "brand": "Visa",
    "last4": "4444",
    "expMonth": 1,
    "expYear": 2027
  },
  "customer": "Juan Perez"
}
```

Respueta fallo por orden ya cobrada/rechazada (200 ok):

```json
{
  "status": "RECHAZADO",
  "message": "Transaccion ya fue aprobada | rechazada",
  "transactionId": "unknown",
  "paymentMethodToken": "token_para_pago_periodico",
  "mandateId": null,
  "card": {
    "brand": "Visa",
    "last4": "4444",
    "expMonth": 1,
    "expYear": 2027
  },
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

Respuesta exito (200 ok):

```json
{
  "status": "APROBADO",
  "message": "Tarjeta eliminada correctamente"
}
```

### `GET /api/ucnpay/tarjeta/:userId`
Obtiene todas las tarjetas dado un id de usuario

Respuesta exito (200 ok):
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

## Peticiones de webhook
Peticiones que hace nuestra pasarela a su backend enviando la informacion de igual manera:
POST `https://tu-comercio/endpoint`

## Transacción aprobada

```json
{
  "event": "transaction.approved",
  "transactionId": "trx_456",
  "idOrden": "SUB-001",
  "operationType": "MIT",
  "status": "APROBADO",
  "monto": 9900,
  "moneda": "CLP",
  "mandateId": "mandate_123",
  "paymentMethodToken": "pm_xxxxxxxxx",
  "customer": "Juan Pérez",
  "card": {
    "brand": "VISA",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028
  },
  "timestamp": "2026-06-24T18:00:00.000Z"
}
```

### Campos opcionales

| mandateId          
| paymentMethodToken
| customer           

---

## Transacción rechazada (Banco)

```json
{
  "event": "transaction.rejected",
  "transactionId": "trx_456",
  "idOrden": "SUB-001",
  "operationType": "MIT",
  "status": "RECHAZADO",
  "monto": 9900,
  "moneda": "CLP",
  "mandateId": "mandate_123",
  "paymentMethodToken": "pm_xxxxxxxxx",
  "customer": "Juan Pérez",
  "card": {
    "brand": "VISA",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028
  },
  "reason": "Fondos insuficientes",
  "timestamp": "2026-06-24T18:00:00.000Z"
}
```

---

## Transacción rechazada (Mandato inexistente)

```json
{
  "event": "transaction.rejected",
  "transactionId": "trx_789",
  "idOrden": "SUB-002",
  "operationType": "MIT",
  "status": "RECHAZADO",
  "monto": 9900,
  "moneda": "CLP",
  "mandateId": null,
  "paymentMethodToken": "pm_xxxxxxxxx",
  "customer": "Juan Pérez",
  "card": {
    "brand": "VISA",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028
  },
  "reason": "No existe un mandato activo para este comercio",
  "timestamp": "2026-06-24T18:00:00.000Z"
}
```


## Notas de integracion
- Una misma tarjeta puede estar guardada por distintos usuarios, pero no se puede repetir la misma tarjeta activa para el mismo usuario.
- En caso de errores de tipos, red, falta de atributos arroja 400 Bad Request
