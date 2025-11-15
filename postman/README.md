Colección Postman para Back-Mobile — Flujo centrado en Mutations

Descripción
- Esta carpeta contiene una colección Postman (`collection.json`) con requests pensados para probar las mutaciones (mutations) principales del backend GraphQL.
- Cobertura principal: registrar usuario, login, operaciones de proyecto (crear/actualizar/eliminar/agregar miembro), subir avatar y logout.

Precondiciones
- Backend corriendo en `http://localhost:3000` (o ajustar host/puerto si corresponde).
- Tener las variables de entorno correctas (`.env` o `.env.docker`) para MongoDB y Redis si las usa localmente.

Arranque rápido (si desarrollas localmente)
```powershell
npm install
npm run dev
```

Headers importantes
- `Content-Type: application/json` para todas las peticiones GraphQL en raw JSON.
- `Authorization: Bearer <TOKEN>` cuando la mutation requiere autenticación.

Flujo recomendado (mutations) — pasos y ejemplos

1) Register (crear usuario)
- GraphQL mutation: `register`
- Body (JSON):
```json
{
  "query": "mutation Register($input: RegisterInput!){ register(input: $input) { token user { id email } } }",
  "variables": {
    "input": {
      "email": "test+1@example.com",
      "password": "Test12345",
      "profile": { "firstName": "Test", "lastName": "User" }
    }
  }
}
```
- Resultado esperado: `data.register.token` y `data.register.user.id` (guardar token para siguientes pasos).

2) Login
- GraphQL mutation: `login`
- Body (JSON):
```json
{
  "query": "mutation($email: String!, $password: String!){ login(email: $email, password: $password){ token user { id email } } }",
  "variables": {"email":"test+1@example.com","password":"Test12345"}
}
```
- Resultado esperado: `data.login.token` (igual que register). Copia el token.

3) Crear proyecto (CreateProject)
- Requiere header `Authorization: Bearer <TOKEN>`.
- GraphQL mutation: `createProject`
- Body (JSON):
```json
    {
    "query": "mutation CreateProject($input: CreateProjectInput!){ createProject(input: $input) { id name description owner { id email } createdAt } }",
    "variables": { "input": { "name": "Proyecto de prueba", "description": "Creado via Postman" } }
    }
```
- Resultado esperado: `data.createProject` con `owner { id email }` no-null.

4) Update project (UpdateProject)
- Header `Authorization: Bearer <TOKEN>`.
- GraphQL mutation: `updateProject`
- Ejemplo body (cambiando el nombre):
```json
{
  "query": "mutation UpdateProject($id: ID!, $input: UpdateProjectInput!){ updateProject(id: $id, input: $input) { id name description updatedAt } }",
  "variables": { "id": "<PROJECT_ID>", "input": { "name": "Nombre actualizado" } }
}
```

5) Add team member (AddTeamMember)
- Header `Authorization: Bearer <TOKEN>` (solo owner puede).
- Body:
```json
{
  "query": "mutation AddMember($projectId: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId: $projectId, input: $input) { id team { user { id email } role permissions } } }",
  "variables": { "projectId": "<PROJECT_ID>", "input": { "email": "other@example.com", "role": "ingeniero_residente", "permissions": ["perm1","perm2"] } }
}
```

6) Upload avatar (UploadAvatar)
- Header `Authorization: Bearer <TOKEN>`.
- GraphQL mutation: `uploadAvatar(avatarUrl: String!)` — si tu implementación usa solo URL, envía la URL en variables.

7) Logout (revocar token)
- Header `Authorization: Bearer <TOKEN>`.
- GraphQL mutation: `logout` (sin variables). Resultado esperado: `true`.

Ejemplos rápidos con curl
- Register:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation Register($input: RegisterInput!){ register(input: $input) { token user { id email } } }","variables":{"input":{"email":"test+1@example.com","password":"Test12345","profile":{"firstName":"Test","lastName":"User"}}}}'
```

- Login:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation($email: String!, $password: String!){ login(email: $email, password: $password){ token user { id email } } }","variables":{"email":"test+1@example.com","password":"Test12345"}}'
```

- Crear proyecto (ejemplo):
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_AQUI>" \
  -d '{"query":"mutation CreateProject($input: CreateProjectInput!){ createProject(input: $input) { id name description owner { id email } createdAt } }","variables":{"input":{"name":"Proyecto de prueba","description":"Creado via curl"}}}'
```

Notas y troubleshooting
- Asegúrate de enviar `Content-Type: application/json` cuando uses el body raw; un body mal formado causa `SyntaxError: Unexpected token` en el servidor.
- Si `owner.id` sale `null` revisa que el token usado corresponde al usuario que crea el proyecto y que el backend devuelve `owner` poblado. El flujo normal (register/login → createProject) devuelve `owner` poblado si el repositorio hace `populate` o el resolver lo transforma.
- Si quieres, exporto también un entorno Postman con la variable `token` preconfigurada.

Si quieres que genere pasos automáticos o un script que haga todo el flujo (register → login → createProject) en curl o en un pequeño script node, dímelo y lo creo.