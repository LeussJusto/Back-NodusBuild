# Back‑Mobile (GraphQL + TypeScript)

Backend para app móvil con GraphQL (Apollo Server), TypeScript, Clean Architecture, MongoDB (Mongoose) y Redis para revocación de tokens JWT.

• GraphQL endpoint: http://localhost:3000/graphql

## Contenidos

- Requisitos
- Variables de entorno
- Levantar con Docker Compose
- Levantar local (sin Docker)
- Ejecutar tests
- Módulo Auth
- Módulo Project
- Arquitectura
- Seguridad

## Requisitos

- Node.js 18+
- Docker y Docker Compose (para entorno con contenedores)
- Cuenta de MongoDB Atlas o instancia local de MongoDB (solo necesaria para flows reales/E2E)

## Variables de entorno

Usa un archivo .env en la raíz. Para evitar errores con Redis según el entorno:

- Local (Node fuera de Docker):
	- REDIS_URL=redis://localhost:6379
- Docker Compose (backend y redis en contenedores):
	- REDIS_URL=redis://redis:6379

Mínimo recomendado:

```
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=replace_this_with_a_secure_secret
JWT_EXPIRES=1h

# Redis
# Local:     redis://localhost:6379
# Docker:    redis://redis:6379
REDIS_URL=redis://localhost:6379

# MongoDB (para flows reales/E2E). Ej: Atlas
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

Nota: En producción JWT_SECRET es obligatorio.

## Levantar con Docker Compose

1) Crea/ajusta .env.docker (este repo ya incluye un ejemplo) y asegúrate de que REDIS_URL sea redis://redis:6379.
2) docker-compose ya carga .env.docker para el contenedor del backend.
3) Levanta servicios:

```powershell
docker-compose up -d
```

4) Accede a GraphQL Playground en:
http://localhost:3000/graphql

Logs:

```powershell
docker-compose logs -f backend
docker-compose logs -f redis
```

Detener:

```powershell
docker-compose down
```

## Levantar local (sin Docker)

Usando Redis de Docker y Node local:

```powershell
# 1) Levanta solo Redis
docker-compose up -d redis

# 2) Configura .env para local
#    REDIS_URL=redis://localhost:6379
#    MONGO_URI=<tu URI de Atlas o local>

# 3) Instala deps y arranca servidor
npm install
npm run dev
```

Servidor en http://localhost:3000/graphql

## Tests

Scripts disponibles (Jest 30):

```powershell
# Unit tests (no necesitan Atlas/Redis)
npm run test:unit

# Integration tests (mocks/semimocks)
npm run test:integration

# E2E tests (requiere MONGO_URI válido y Redis activo)
npm run test:e2e
```

Requisitos E2E:
- MONGO_URI apuntando a Atlas o una instancia real.
- Redis en ejecución (docker-compose up -d redis).
- Los tests E2E validan flujos completos de Auth y Project usando MongoDB real y blacklist en Redis.

Troubleshooting:
- Si al correr E2E ves ENOTFOUND redis, estás corriendo local con REDIS_URL para Docker. Cambia a redis://localhost:6379.
- Si Jest no termina, asegúrate de que las conexiones se cierran; los tests ya incluyen cleanup de Apollo/Mongo/Redis.

## Módulo Auth

Autenticación completa con JWT y revocación de tokens via Redis.

Funcionalidades:
- **register**: crea usuario y retorna { token, user }
- **login**: valida credenciales y retorna { token, user }
- **me**: retorna el usuario autenticado desde el token
- **uploadAvatar**: actualiza el avatar del usuario autenticado
- **logout**: revoca el token actual (se guarda en Redis con TTL hasta exp)

Detalles clave:
- Los tokens firmados incluyen el id del usuario; expiración configurable (JWT_EXPIRES).
- La revocación usa una blacklist en Redis con TTL igual al tiempo restante del token.
- El middleware verifica el JWT y consulta Redis antes de poblar el user en el contexto.

### GraphQL: Mutations

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    token
    user { id email }
  }
}

mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user { id email }
  }
}

mutation UploadAvatar($u: String!) {
  uploadAvatar(avatarUrl: $u) {
    id
    email
    profile { avatar }
  }
}

mutation { logout }
```

### GraphQL: Query

```graphql
query { me { id email } }
```

Headers para llamadas autenticadas:

```
Authorization: Bearer <JWT>
```

## Módulo Project

Gestión de proyectos con permisos por rol y reglas de acceso claras.

- Cualquiera puede crear un proyecto.
- El creador se convierte automáticamente en ingeniero_residente (owner) del proyecto.
- Solo el owner puede actualizar o eliminar el proyecto, y agregar/quitar miembros.
- Un usuario puede ver un proyecto si es owner o miembro del equipo.
- Al agregar miembros, se puede indicar userId o email (se resuelve el email a userId).

Roles en español (ProjectRole):
- ingeniero_residente (owner)
- ingeniero_produccion
- ingeniero_calidad
- ingeniero_especialidades
- ingeniero_acabados
- administrador_obra
- almacenero

Estados (ProjectStatus): planning | active | paused | completed | cancelled

Permisos por rol por defecto:
- Ver `src/shared/constants/project.ts` (DEFAULT_PERMISSIONS_BY_ROLE). El repositorio usa estos permisos al crear el proyecto para el owner.

Validaciones y utilidades:
- Autenticación en resolvers con `requireAuth` (shared/utils/auth.ts).
- Fechas de Timeline: los strings se convierten a Date en el resolver (`parseTimeline` en shared/utils/date.ts).
- Reglas de dominio (owner, acceso, etc.) en `src/domain/services/ProjectDomainService.ts`.

### GraphQL: Queries

Consultar tus proyectos (owner o miembro):

```graphql
query MyProjects {
  myProjects {
    id
    name
    status
  }
}
```

Obtener proyecto por id (requiere acceso):

```graphql
query Project($id: ID!) {
  project(id: $id) {
    id
    name
    status
    team { user { id email } role permissions }
  }
}
```

### GraphQL: Mutations

Crear proyecto (el usuario autenticado será ingeniero_residente):

```graphql
mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    name
    status
  }
}
```

Variables:

```json
{
  "input": {
    "name": "Obra 1",
    "description": "Edificio demo",
    "timeline": { "startDate": "2025-01-01", "endDate": "2025-06-30" },
    "budget": { "total": 1000000, "currency": "PEN" }
  }
}
```

Actualizar proyecto (solo owner):

```graphql
mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
  updateProject(id: $id, input: $input) { id name status }
}
```

Eliminar proyecto (solo owner):

```graphql
mutation DeleteProject($id: ID!) { deleteProject(id: $id) }
```

Agregar miembro (solo owner; por userId o email):

```graphql
mutation AddTeamMember($pid: ID!, $input: AddTeamMemberInput!) {
  addTeamMember(projectId: $pid, input: $input) { id name }
}
```

Variables ejemplo por email:

```json
{
  "pid": "<projectId>",
  "input": {
    "email": "miembro@example.com",
    "role": "ingeniero_calidad",
    "permissions": []
  }
}
```

Quitar miembro (solo owner, no puedes quitar al owner):

```graphql
mutation RemoveTeamMember($pid: ID!, $uid: ID!) {
  removeTeamMember(projectId: $pid, userId: $uid) { id name }
}
```

Headers para llamadas autenticadas:

```
Authorization: Bearer <JWT>
```

Troubleshooting:
- "No autenticado": agrega el header Authorization con tu JWT.
- "Solo el creador del proyecto puede realizar esta acción": solo el owner puede modificar/borrar/gestionar miembros.
- "No puedes quitar al creador del proyecto": regla de negocio al remover miembros.

## Arquitectura

Clean Architecture con separación de capas:

- **domain/**: entidades, servicios de dominio (reglas de negocio puras), contratos de repositorio
- **application/**: casos de uso (AuthService, ProjectService), DTOs
- **infrastructure/**: config/env, db (Mongoose), cache (Redis), tokenBlacklist, container (DI)
- **interface/**: GraphQL schema, resolvers, middleware (context + auth)
- **shared/**: utilidades reutilizables (auth helpers, date parsing, constantes)
- **test/**: unit, integration, e2e

Puntos clave:
- El container (`src/infrastructure/container.ts`) compone dependencias y se inyectan por el contexto de Apollo.
- La blacklist de tokens usa Redis con TTL; en tests o si Redis no está disponible, el código falla de forma segura (fail-open).
- Los resolvers validan autenticación con `requireAuth` (shared/utils/auth.ts).
- Las reglas de dominio (owner, acceso) están en servicios de dominio (`ProjectDomainService`, `AuthDomainService`).

## Seguridad

- No publiques credenciales reales en el repositorio.
- Usa archivos locales (por ejemplo, .env.local) para secretos.
- Cambia JWT_SECRET en producción y usa HTTPS en despliegues reales.
- Los tokens JWT se revocan mediante blacklist en Redis con TTL automático.

