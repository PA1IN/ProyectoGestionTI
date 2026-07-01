# Integracion Proyecto 11 

## Payload de alertas

Estos son los posibles payload que tendria una alerta enviada desde nuestra pasarela a su proyecto. En caso de tener dudas o cambiar a 1 solo payload me comunican.

### Transacciones que discrepan en el monto

En caso que se manipule el monto durante el flujo de la operacion.

```json
{
    "sistema_id": "P04",
    "creado_en": "2026-06-28T00:30:00Z",
    "payload": {
        "tipo": "Transaccion",
        "error": "NOT_EQUAL",
        "id_transaccion": "886ead0d-60fc-4156-89d9-ee7de4eef637",
        "monto_original": 10000,
        "monto_cobrado": 20000
    }
}
```

### Reintentos sospechosos de una misma tarjeta

En caso que una misma tarjeta sea utilizada para varias transacciones y que sean rechazadas.

```json
{
    "sistema_id": "P04",
    "creado_en": "2026-06-28T00:30:00Z",
    "payload": {
        "tipo": "Transaccion",
        "error": "RETRY_WARNING",
        "ultimos_4": 4243,
        "cantidad": 4,
        "transacciones": ["886ead0d-60fc-4156-89d9-ee7de4eef637","e48677e1...","7b1f22d6...","fbe589eb..."]
    }
}
```

### Discrepancia en la conciliacion con el banco

En caso que exista una discrepancia entre el banco y nuestra pasarela con las transacciones del dia.

```json
{
    "sistema_id": "P04",
    "creado_en": "2026-06-28T00:30:00Z",
    "payload": {
        "tipo": "Conciliacion",
        "tipo_discrepancia": "DIFERENCIA_DE_MONTO",
        "id_transaccion": "886ead0d-60fc-4156-89d9-ee7de4eef637",
        "rrn": 512461,
        "id_archivo": "45c5732b-2a95-417b-9041-4d62284aa3d6"
    }
}
```


## Consideraciones de los tipos

- Los tipos de discrepancias son: EXISTE_EN_BANCO, FALTANTE_EN_BANCO, DIFERENCIA_DE_MONTO.
- La alerta de las transacciones sospechosas, las transacciones son un array de 4 de las id de las transacciones que usan la misma tarjeta.
- El rrn es un numero
- El id_transaccion en la alerta de discrepancia puede ser nulo en caso de existir en el banco. (diganme si es mejor null o string vacio)  