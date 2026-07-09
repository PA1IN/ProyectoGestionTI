## Configuración necesario para levantar el proyecto localmente

### Requisitos

Tener instalado Docker Desktop. (Al instalar docker desktop se instala los comandos de la shell/terminal)


### Instrucciones

En la carpeta raíz del proyecto, se tiene que poner el siguiente comando para iniciar y crear el contenedor de docker.

```bash
$ docker-compose up -d --build
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

