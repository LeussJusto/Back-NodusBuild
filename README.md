# Back‑Mobile (GraphQL + TypeScript)

Backend para app móvil con GraphQL (Apollo Server), TypeScript, Clean Architecture, MongoDB (Mongoose) y Redis para revocación de tokens JWT.

• GraphQL endpoint: http://localhost:3000/graphql

## Contenidos

- Qué hace Auth
- Requisitos
- Variables de entorno (local vs Docker)
- Levantar con Docker Compose
- Levantar local (sin Docker)
- Ejecutar tests (unit, integration, e2e)
- Esquema y ejemplos GraphQL

## Qué hace Auth

Módulo de autenticación completo con JWT y revocación de tokens via Redis:

- register: crea usuario y retorna { token, user }
- login: valida credenciales y retorna { token, user }
- me: retorna el usuario autenticado desde el token
- uploadAvatar: actualiza el avatar del usuario autenticado
- logout: revoca el token actual (se guarda en Redis con TTL hasta exp)

Detalles clave:
- Los tokens firmados incluyen el id del usuario; expiración configurable (JWT_EXPIRES).
- La revocación usa una blacklist en Redis con TTL igual al tiempo restante del token.
- El middleware verifica el JWT y consulta Redis antes de poblar el user en el contexto.

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
- El test E2E valida el flujo: register → login → me → uploadAvatar → logout → me(null) usando la blacklist en Redis.

Troubleshooting:
- Si al correr E2E ves ENOTFOUND redis, estás corriendo local con REDIS_URL para Docker. Cambia a redis://localhost:6379.
- Si Jest no termina, asegúrate de que las conexiones se cierran; el test ya incluye cleanup de Apollo/Mongo/Redis.

## Esquema y ejemplos GraphQL

Mutations

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

Query

```graphql
query { me { id email } }
```

Headers para llamadas autenticadas:

```
Authorization: Bearer <JWT>
```

## Arquitectura (resumen)

- domain/: entidades, servicios de dominio, contratos de repositorio
- application/: casos de uso (AuthService), DTOs
- infrastructure/: config/env, db (Mongoose), cache (Redis), tokenBlacklist, container (DI)
- interface/: GraphQL schema, resolvers, middleware (context + auth)
- test/: unit, integration, e2e

Puntos clave:
- El container compone dependencias y se inyectan por el contexto de Apollo.
- La blacklist de tokens usa Redis con TTL; en tests o si Redis no está disponible, el código falla de forma segura.

## Notas de seguridad

- No publiques credenciales reales en el repositorio.
- Usa archivos locales (por ejemplo, .env.local) para secretos.
- Cambia JWT_SECRET en producción y usa HTTPS en despliegues reales.

