


## Setup del proyecto

```bash
$ npm install
```

## Levantar la base de datos con docker primero en la raiz del proyecto

```bash
$ docker-compose up -d --build db
```

## Para compilar el proyecto por microservicio (sin docker)

```bash
#Terminal 1
$ npm run start:dev pagos
#Terminal 2
$ npm run start:dev conciliacion
#Terminal 3
$ npm run start:dev analitica
```

## Para correr tests

```bash
#Terminal 1
$ npm run test:pagos
#Terminal 2
$ npm run test:conciliacion
#Terminal 3
$ npm run test:analitica
```

