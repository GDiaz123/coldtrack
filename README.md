# COLDTRACK AI+

COLDTRACK AI+ is a SaaS platform for intelligent cold-chain monitoring in healthcare organizations. It includes two main panels:

- **Super Administrator Panel**: manages companies, users, plans, global status, and platform statistics.
- **Company Panel**: operational dashboard for each client company. It only reads and streams data for its own company.

The project is designed as a production-oriented Next.js application with backend route handlers, repository abstractions, a realistic simulated sensor provider, Prisma/PostgreSQL readiness, Docker support, and deployment preparation.

---

## Architecture

The application follows a layered architecture:

```text
Frontend React components
  -> hooks in lib/hooks
  -> Next.js Route Handlers in app/api
  -> server services/repositories in lib/server
  -> domain types and business rules in lib/domain
  -> sensor provider abstraction
```

Main backend abstractions:

- `ColdtrackRepository`: persistence boundary for companies, users, sensors, readings, events, and dashboards.
- `ISensorProvider`: sensor telemetry boundary.
- `SimulatedSensorProvider`: current realistic simulation provider.
- Future providers can implement the same interface for ESP32, MQTT, AWS IoT Core, Arduino, or industrial gateways.

The frontend does not own important business logic. It consumes snapshots and SSE updates from the API.

---

## Folder Structure

```text
app/
  admin/                         Super admin UI
  dashboard/[companyId]/          Company dashboard route
  api/
    admin/                        Super admin API
    auth/                         Login/logout/session API
    company/[companyId]/          Tenant-isolated company API
    health/                       Health check
components/
  admin/                          Admin panel components
  coldtrack-dashboard.tsx         Company operational dashboard
  ui/                             Shared UI components
lib/
  domain/                         Pure domain types and rules
  hooks/                          Client hooks for auth, admin, company data
  server/                         Backend services, repository factory, logging
prisma/
  schema.prisma                   PostgreSQL schema
Dockerfile
docker-compose.yml
vercel.json
.env.example
```

---

## Local Development With Local Database

Use this mode when you want your database to stay local on your machine.

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. In `.env`, use:

```ini
DATABASE_DISABLED=false
DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack?schema=public"
JWT_SECRET="change-this-to-a-long-random-secret"
SENSOR_PROVIDER="simulated"
```

4. Start local PostgreSQL:

```bash
docker compose up db -d
```

5. Apply schema and seed demo users/plans:

```bash
npm run db:push
npm run db:seed
```

6. Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Docker

Run the app and PostgreSQL locally:

```bash
docker compose up --build
```

The app will be available at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

If your Docker installation uses the legacy CLI, run:

```bash
docker-compose up --build
```

Default local database created by Docker Compose:

```ini
POSTGRES_USER=coldtrack
POSTGRES_PASSWORD=coldtrack_secret
POSTGRES_DB=coldtrack
POSTGRES_PORT=5432
DATABASE_URL=postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack?schema=public
```

The `app` container connects to PostgreSQL through the internal Docker hostname `db`, while local commands such as `npm run dev`, `npm run db:push`, and `npm run db:seed` use `localhost:5432`.

---

## Docker Snapshot Without Touching Current Containers

If you already have the original demo containers running, use the isolated compose file instead of the default one. It uses different container names, project name, ports, and volume:

```powershell
docker compose -p coldtrack-next -f docker-compose.next.yml up --build
```

Open:

```text
http://localhost:3100
```

This creates only:

```text
coldtrack-next-app
coldtrack-next-postgres
postgres_next_data
```

Your existing containers such as `coldtrack-app` and `coldtrack-postgres` are not renamed, removed, or reused.

To stop only this snapshot:

```powershell
docker compose -p coldtrack-next -f docker-compose.next.yml down
```

To reset only this snapshot database:

```powershell
docker compose -p coldtrack-next -f docker-compose.next.yml down -v
```

---

## Plans And Limits

The commercial plans are:

```text
Basico   S/ 1200/mes   up to 8 sensors
Premium  $1600/mes     up to 40 sensors
```

Sensor limits are enforced in the backend when creating sensors and reflected in the company dashboard.

---

## Worker Registration

Company administrators can share their company registration key with workers. A worker uses the `Trabajador` option on `/register`, enters the key, and is created as a company `SUPERVISOR`.

The registration key and alert phone are stored on the company record. The current phone field prepares the app for SMS/WhatsApp integration later; today, critical alerts trigger a local sound while the dashboard page is open.

---

## Vercel Deployment With Local Database

Important: **Vercel cannot connect to a database running on your laptop as `localhost`**. In Vercel, `localhost` points to Vercel's runtime, not your machine.

For that reason, the project supports two modes:

### Local Mode

Use PostgreSQL on your machine:

```ini
DATABASE_DISABLED=false
DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack?schema=public"
```

### Vercel Demo Mode Without Remote Database

Use backend memory mode and simulated telemetry:

```ini
DATABASE_DISABLED=true
SENSOR_PROVIDER="simulated"
RUN_DEMO_SEED=false
```

This is the correct mode if you want to deploy the app to Vercel while keeping your database local for development only.

Data created in Vercel memory mode is not persistent between runtime restarts. That is expected.

### Steps To Deploy To Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Vercel will detect Next.js automatically.
4. `vercel.json` already configures non-secret demo-mode defaults:

```json
{
  "DATABASE_DISABLED": "true",
  "SENSOR_PROVIDER": "simulated",
  "RUN_DEMO_SEED": "false"
}
```

5. In Vercel Project Settings > Environment Variables, add:

```ini
JWT_SECRET="use-a-long-random-secret"
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
NEXT_PUBLIC_DEFAULT_COMPANY_ID="empresa-a"
```

6. Do **not** set `DATABASE_URL` in Vercel while your database is only local.
7. Deploy.
8. Validate:

```text
https://your-project.vercel.app/api/health
```

### Demo Credentials In Memory Mode

```text
admin@coldtrack.ai       / password123
valeria@santaaurora.pe   / password123
andrea@bionorte.pe       / password123
luis@vitalred.pe         / password123
```

---

## When You Want Persistence On Vercel

Use a database reachable by Vercel, for example:

- Vercel Postgres
- Neon
- Supabase
- Railway PostgreSQL
- AWS RDS with network access configured correctly

Then set in Vercel:

```ini
DATABASE_DISABLED=false
DATABASE_URL="postgresql://..."
```

Run migrations/seed against that remote database:

```bash
npm run db:push
npm run db:seed
```

No frontend changes are required. `getColdtrackRepository()` selects PostgreSQL when the database is configured and available; otherwise it falls back to memory mode only when database usage is disabled or unavailable in development/demo mode.

---

## Backend

The backend is implemented with Next.js Route Handlers:

- `/api/auth/*`: login, logout, current user, registration.
- `/api/admin/*`: super admin data, company/user management, SSE stream.
- `/api/company/[companyId]/*`: tenant-isolated dashboard, sensors, events, reports, SSE stream.
- `/api/health`: runtime health check.

Tenant isolation is enforced by route-level auth checks and repository queries scoped by `companyId`.

The company panel never needs data from another company.

---

## Frontend

The frontend uses:

- React Client Components for interactive dashboards.
- `useAuth()` for session and role validation.
- `useCompanyDashboard()` for company snapshot + SSE updates.
- `useAdminDashboard()` for super admin snapshot + SSE updates.

The UI updates sensor readings without refreshing the full page.

---

## Simulation

The current simulation is backend-side and uses registered sensors only. Sensors are not hardcoded in the frontend.

Simulation behavior:

- gradual temperature movement toward a thermal target
- small drift over time
- stable humidity with minor variation
- slow battery drain
- occasional signal loss
- automatic reconnection
- critical events only when state changes or a relevant condition appears
- smooth trend arrays for graphs

The current implementation is `SimulatedSensorProvider`. Future real providers should implement `ISensorProvider`.

---

## Add New Sensors

From the company dashboard:

1. Login as a company user.
2. Open **Gestion de Sensores**.
3. Register code, name, location, product type, min temperature, and max temperature.
4. The backend creates the sensor for that company only.
5. The simulation starts using that registered sensor.

API:

```http
POST /api/company/[companyId]/sensors
```

---

## Add New Companies

From the super admin panel:

1. Login as `admin@coldtrack.ai`.
2. Open the companies section.
3. Register company data and plan.
4. Create users assigned to that company.

API:

```http
POST /api/admin/companies
POST /api/admin/users
```

---

# Preparacion Para AWS

AWS is not implemented as the active production target yet. The project is prepared so it can be moved later.

Recommended AWS services:

- **EC2 or ECS Fargate** for the Next.js app.
- **Amazon RDS PostgreSQL** for persistent data.
- **Amazon S3** for reports and exported audit files.
- **AWS IAM** for least-privilege access.
- **AWS IoT Core** for future MQTT telemetry from ESP32, Arduino, or industrial gateways.
- **CloudWatch** for logs and metrics.
- **Application Load Balancer** if deploying containers.

## Deploy Backend On EC2 Later

1. Provision EC2 with Docker.
2. Copy the repository or pull from Git.
3. Configure production `.env`:

```ini
NODE_ENV=production
DATABASE_DISABLED=false
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
SENSOR_PROVIDER="simulated"
```

4. Run:

```bash
docker compose up --build -d
```

5. Put Nginx or an Application Load Balancer in front of port `3000`.
6. Keep SSE connections alive by preserving streaming headers and using an idle timeout greater than the SSE ping interval.

## Deploy Frontend

The frontend is part of the same Next.js app. On EC2/ECS, the same container serves frontend and backend route handlers.

On Vercel, Vercel hosts both the frontend and backend route handlers.

## Use Amazon S3 Later

The project already has AWS-related server modules prepared. For production:

1. Create an S3 bucket for reports.
2. Set `AWS_REGION` and `AWS_S3_BUCKET`.
3. Prefer IAM roles instead of access keys.
4. Store report files in S3 and save metadata in PostgreSQL.

## Integrate IAM

Use least privilege:

- App runtime can write/read only the report bucket.
- App runtime can connect only to the target RDS database.
- IoT ingestion roles should publish only to required topics/queues.

## Connect AWS IoT Core Later

Future path:

1. Register devices as AWS IoT Things.
2. Use MQTT topics like `coldtrack/{companyId}/{sensorCode}/telemetry`.
3. Route telemetry through AWS IoT Rules to Lambda, SQS, or Timestream/PostgreSQL.
4. Implement a new provider, for example `AWSIoTSensorProvider`, that satisfies `ISensorProvider`.
5. Set:

```ini
SENSOR_PROVIDER="aws"
```

The frontend should not need changes.

## Files To Modify For AWS Deployment

- `.env` or cloud environment variables
- `lib/server/coldtrack-store.ts` provider factory
- `lib/server/aws-config.ts`
- `lib/server/s3-reports.ts`
- infrastructure files you add later, such as Terraform, CDK, or ECS task definitions

## Production Best Practices

- Never commit real secrets.
- Rotate any key that was ever committed or shared.
- Use HTTPS everywhere.
- Use managed PostgreSQL with backups.
- Add observability: structured logs, request IDs, and CloudWatch alerts.
- Run migrations through CI/CD.
- Protect admin routes with strong authentication and MFA when moving beyond demo mode.
