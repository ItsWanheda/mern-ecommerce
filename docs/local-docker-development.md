# Local Docker Development

This setup runs the Next.js frontend and Node.js backend in Docker while reusing the existing PostgreSQL and Redis containers. Product, category, and campaign image files are stored in the persistent Docker volume named \`hardware-store-product-images\`.

## Requirements

- Docker Desktop running with the Linux container engine.
- The existing \`mern-postgres\` and \`mern-redis\` containers.
- A working \`backend/.env\` file with the PostgreSQL credentials and application secrets used by the local backend.

Do not delete or recreate the existing PostgreSQL or Redis volumes.

## One-time Windows / PowerShell setup

Run these commands from the repository root.

### 1. Start the existing database containers

\`\`\`powershell
docker start mern-postgres
docker start mern-redis
\`\`\`

### 2. Create a shared Docker network and attach the existing database containers

\`\`\`powershell
docker network inspect hardware-store-network *> $null
if ($LASTEXITCODE -ne 0) {
    docker network create hardware-store-network
}

$attached = docker network inspect hardware-store-network --format '{{range .Containers}}{{println .Name}}{{end}}'
if ($attached -notmatch 'mern-postgres') {
    docker network connect --alias postgres hardware-store-network mern-postgres
}
if ($attached -notmatch 'mern-redis') {
    docker network connect --alias redis hardware-store-network mern-redis
}
\`\`\`

The aliases \`postgres\` and \`redis\` are the hostnames the backend container uses. This bypasses host-published ports and does not replace either database container.

### 3. Create a Docker-specific backend environment file

The regular \`backend/.env\` is used when running Node directly on Windows. The Docker container needs the database and Redis hostnames on the shared Docker network.

\`\`\`powershell
if (-not (Test-Path .\\backend\\.env)) {
    throw "backend/.env was not found. Create it from backend/.env.example and fill in your existing database credentials and secrets first."
}

$dockerEnv = Get-Content .\\backend\\.env -Raw
$dockerEnv = $dockerEnv -replace '@(?:localhost|127\\.0\\.0\\.1)(?=:5432)', '@postgres'
$dockerEnv = $dockerEnv -replace 'redis://(?:localhost|127\\.0\\.0\\.1)(?=:6379)', 'redis://redis'
$dockerEnv = [regex]::Replace($dockerEnv, '(?m)^NODE_ENV=.*$', 'NODE_ENV=development')
$dockerEnv = [regex]::Replace($dockerEnv, '(?m)^PORT=.*$', 'PORT=5000')

if ($dockerEnv -match '(?m)^CORS_ALLOWED_ORIGINS=.*$') {
    $dockerEnv = [regex]::Replace($dockerEnv, '(?m)^CORS_ALLOWED_ORIGINS=.*$', 'CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000')
} else {
    $dockerEnv += [Environment]::NewLine + 'CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000' + [Environment]::NewLine
}

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) 'backend/.env.docker'),
    $dockerEnv,
    [System.Text.UTF8Encoding]::new($false)
)
\`\`\`

The command copies the current credentials and secrets without printing them. It only changes local database/Redis hostnames in the Docker copy. The original \`backend/.env\` is not modified. If your original database URL uses a hostname other than \`localhost\` or \`127.0.0.1\`, edit the Docker copy and set its host to \`postgres\`.

## Start the project

From the repository root:

\`\`\`powershell
docker compose config
docker compose up -d --build
docker compose ps
\`\`\`

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health
- Backend readiness: http://localhost:5000/api/ready

Follow startup logs:

\`\`\`powershell
docker compose logs -f backend frontend
\`\`\`

The frontend proxies \`/api/*\` requests to the backend and proxies \`/uploads/*\` image requests to the backend. You do not need to configure browser CORS for another hostname.

## Image storage

New product images are saved under \`/app/uploads/products\`, category images under \`/app/uploads/categories\`, and campaign images under \`/app/uploads/campaigns\`. In Docker, \`/app/uploads\` is backed by the named volume \`hardware-store-product-images\`.

Confirm the volume exists:

\`\`\`powershell
docker volume ls
docker exec hardware-store-backend sh -c "find /app/uploads -type f"
\`\`\`

Stopping or recreating the application containers does not delete the image volume.

## Daily commands

\`\`\`powershell
# Start / rebuild after pulling code changes
docker compose up -d --build

# Check containers
docker compose ps

# View logs
docker compose logs -f backend frontend

# Stop the app containers while keeping images and database data
docker compose down
\`\`\`

**Do not run \`docker compose down -v\` or \`docker volume prune\`** unless you intentionally want to delete persistent Docker data.

The PostgreSQL and Redis containers remain separate and are not stopped by \`docker compose down\`.

## Notes

- This Compose configuration is for local development. It mounts the working tree into the containers so edits in VS Code are visible, and Node restarts when backend source files change.
- Existing Cloudinary URLs already stored in PostgreSQL are left unchanged and can continue to load. New uploads use local Docker storage. Existing remote images are not automatically downloaded or migrated.
- Docker volumes are local to this computer. Back up \`hardware-store-product-images\` separately before reinstalling Docker or moving the project to another machine.
