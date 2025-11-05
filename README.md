## Introducción

Este repositorio contiene el backend de Nodus Build, una plataforma colaborativa para ingenieros civiles en proyectos de edificación. Su objetivo es ofrecer una aplicación web y una app móvil con un asistente que facilite la coordinación de proyectos, comunicación entre equipos, gestión de documentos y seguimiento de tareas e indicadores.


## Arquitectura y tecnologías

- Lenguaje: Node.js con TypeScript
- API: GraphQL (Apollo Server)
- Base de datos: MongoDB (usualmente Atlas, vía MONGO_URI)
- Cache/Blacklist: Redis (para logout seguro y otros usos)
- Patrón: Clean Architecture (domain → application → infrastructure → interface)
- Testing: Jest (unit, integration y e2e)

Estructura principal por capas en `src/`:
- domain: entidades, servicios de dominio y contratos de repositorios
- application: servicios de aplicación, DTOs, orquestación de casos de uso
- infrastructure: modelos Mongoose, repositorios, config, storage, DI
- interface: GraphQL (schema, resolvers, tipos) y middleware
- shared: utilidades, constantes y errores comunes
- test: unit, integration y e2e


## Requisitos previos

- Node.js 18 o superior
- Una instancia de MongoDB accesible (por ejemplo, MongoDB Atlas) y su cadena de conexión
- Redis local o en contenedor (opcional pero recomendado para blacklist de tokens)
- Variables de entorno configuradas (ver sección de variables de entorno)


## Variables de entorno

Configura un archivo de entorno con, al menos:
- PORT: puerto HTTP del backend (por defecto 3000)
- MONGO_URI: cadena de conexión a MongoDB
- JWT_SECRET y JWT_EXPIRES: firma y expiración de tokens
- REDIS_URL: URL de Redis cuando aplique

En ejecución con Docker, se usa `.env.docker` para inyectar estas variables al contenedor del backend.


## Puertos y endpoints

- Backend HTTP: 3000 (configurable vía PORT)
- Redis: 6379 (si se usa el docker-compose incluido)
- GraphQL endpoint: `/graphql`
- Health check: `/health`
- Voyager (explorador del esquema GraphQL): `/voyager`
- Archivos estáticos subidos (desarrollo/local): `/uploads`


## Inicio rápido (sin comandos específicos)

1) Instala dependencias del proyecto con el gestor de paquetes de Node.
2) Configura las variables de entorno necesarias (PORT, MONGO_URI, JWT_SECRET, etc.).
3) Inicia el servidor en modo desarrollo para recarga en caliente.
4) Abre el navegador y visita el endpoint de GraphQL para probar consultas y mutaciones.
5) Opcional: levanta Redis localmente o mediante el archivo de orquestación provisto para soportar blacklist de tokens y futuras funcionalidades de cache.

Alternativamente, puedes utilizar el archivo de orquestación incluido para levantar el backend y Redis en contenedores, mapeando el puerto 3000 del host al contenedor.


## Modos de ejecución

- Desarrollo: ejecución con recarga en caliente, útil para iterar rápidamente.
- Producción: compilación previa y ejecución sobre la salida transpilada.

En ambos casos, el servidor expondrá el endpoint GraphQL y el explorador Voyager si está habilitado.


## Testing

El proyecto integra pruebas automáticas en tres niveles:

- Unit: validan reglas de negocio y servicios de aplicación de manera aislada.
- Integration: validan resolvers y servicios en conjunto, normalmente con dependencias simuladas o mínimas.
- End-to-end (E2E): levantan la app completa y ejercitan flujos reales (por ejemplo, registro, chat directo). Algunas E2E requieren MONGO_URI y, opcionalmente, servicios como Redis; cuando no están disponibles, se omiten de forma segura.

Ejecución general de pruebas: usa el runner de pruebas del proyecto para ejecutar todo el conjunto. También puedes ejecutar únicamente un tipo de pruebas (unit, integration o e2e) usando los scripts definidos.

Ejecución de un test específico: ejecuta el runner indicando la ruta del archivo de prueba (por ejemplo, un spec de e2e o de integración) o filtrando por patrón de nombre.


## GraphQL Voyager

Voyager es un explorador visual del esquema GraphQL que permite navegar tipos, relaciones y entradas de forma interactiva. Está disponible en la ruta `/voyager` del backend y utiliza el endpoint `/graphql` para obtener el esquema. Es útil para entender el modelo, descubrir tipos y validar la coherencia del contrato expuesto.


## Flujo de trabajo recomendado

1) Definir reglas y entidades en la capa de dominio (domain), sin dependencias de infraestructura.
2) Implementar casos de uso en application (servicios de aplicación y DTOs), orquestando repositorios y lógica de dominio.
3) Implementar repositorios e integraciones reales en infrastructure (Mongoose, almacenamiento, DI, config).
4) Exponer el caso de uso en interface a través de GraphQL (schema y resolvers), validando inputs.
5) Escribir pruebas:
	- Unit: para servicios de dominio y de aplicación.
	- Integration: para resolvers y servicios combinados.
	- E2E: para validar flujos completos (autenticación, creación de chats, proyectos, etc.).
6) Ejecutar validaciones locales (tipo, lint y pruebas) antes de crear una rama o abrir un pull request.
7) En CI, ejecutar unit e integration en cada cambio; E2E se pueden condicionar a la disponibilidad de la infraestructura (por ejemplo, base de datos y Redis) o dejarse en un workflow manual.


## Notas adicionales

- Si utilizas Docker, asegúrate de definir correctamente la cadena MONGO_URI en el entorno del contenedor para que el backend se conecte a la base de datos.
- La ruta `/uploads` sirve archivos solo en desarrollo; para producción se recomienda un servicio de almacenamiento dedicado (CDN u object storage).
- La blacklist de tokens depende de Redis; si no está disponible, el middleware maneja este escenario de forma tolerante, pero se recomienda activarlo para un logout robusto.

## Guía rápida con comandos (PowerShell / Docker)

### Local (sin Docker)

1) Instalar dependencias

```powershell
npm install
```

2) Configurar variables de entorno mínimas en la sesión

```powershell
$env:PORT = "3000"
$env:MONGO_URI = "mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"
$env:JWT_SECRET = "changeme"
$env:JWT_EXPIRES = "1h"
# Opcional si usas Redis local o en contenedor
$env:REDIS_URL = "redis://localhost:6379"
```

3) Ejecutar en desarrollo (recarga en caliente)

```powershell
npm run dev
```

4) Compilar y correr en “producción” (salida transpilada)

```powershell
npm run build
npm start
```

Endpoints locales (por defecto):
- GraphQL: http://localhost:3000/graphql
- Voyager: http://localhost:3000/voyager
- Health: http://localhost:3000/health

### Con Docker (backend + Redis)

1) Construir imágenes

```powershell
docker compose build --no-cache
```

2) Levantar servicios

```powershell
docker compose up -d
```

3) Ver logs del backend

```powershell
docker compose logs -f backend
```

4) Apagar y limpiar volúmenes

```powershell
docker compose down -v
```

Notas Docker:
- Define tus variables en `.env.docker` para el servicio `backend` (por ejemplo, `MONGO_URI`, `JWT_SECRET`).
- El backend queda publicado en el puerto 3000 del host.

### Pruebas (todas, por tipo y por archivo)

1) Ejecutar todo el suite

```powershell
npm test
```

2) Ejecutar por tipo

```powershell
npm run test:unit
npm run test:integration
npm run test:e2e
```

3) Ejecutar un archivo de prueba específico

```powershell
npx jest src/test/e2e/chat.e2e.spec.ts --runInBand
```

4) Filtrar por nombre de test

```powershell
npx jest -t "creates a direct chat"
```

5) E2E con dependencia de base de datos (asegura MONGO_URI en la sesión)

```powershell
$env:MONGO_URI = "mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"; npm run test:e2e
```

