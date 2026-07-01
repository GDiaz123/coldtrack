# Configuración AWS — RDS IAM + S3 + ECS

Guía específica para conectar COLDTRACK con tu cluster RDS y bucket S3 en **us-east-1**.

---

## ⚠️ Seguridad importante

**Nunca compartas `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en chat, GitHub o documentos.**

Si ya las expusiste:
1. AWS Console → **IAM** → **Users** → tu usuario → **Security credentials**
2. **Deactivate** la clave expuesta
3. **Create access key** nueva
4. Usa la nueva solo en tu `.env` local (nunca en el repositorio)

En **ECS producción** no uses access keys: el **Task Role** da permisos automáticamente.

---

## Variables de entorno

Copia `.env.example` a `.env` y completa:

```ini
RDS_IAM_AUTH=true
RDS_HOST="coldtrack-db.cluster-ccroq24kgjbk.us-east-1.rds.amazonaws.com"
RDS_PORT=5432
RDS_DATABASE=postgres
RDS_USER=postgres
AWS_REGION=us-east-1
AWS_S3_BUCKET=coldtrack-reports
JWT_SECRET="tu-secreto-largo"

# Solo desarrollo local:
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## Paso 1 — Preparar RDS (IAM Database Authentication)

1. Consola AWS → **RDS** → tu cluster `coldtrack-db`
2. **Modify** → activar **IAM database authentication: Enabled**
3. Aplicar cambios

Conectar como admin y crear el mapping IAM (desde CloudShell o EC2 con acceso):

```sql
-- Conectado como master user
GRANT rds_iam TO postgres;
```

Si usas otro usuario de app:

```sql
CREATE USER coldtrack_app WITH LOGIN;
GRANT rds_iam TO coldtrack_app;
GRANT ALL ON SCHEMA public TO coldtrack_app;
```

---

## Paso 2 — Crear bucket S3 para reportes

1. Consola AWS → **S3** → **Create bucket**
2. Nombre: `coldtrack-reports`
3. Región: **us-east-1**
4. Block public access: **activado** (los reportes se descargan con URL firmada)
5. Crear

---

## Paso 3 — Crear rol IAM para ECS (Task Role)

### 3.1 Crear el rol

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **Elastic Container Service** → **Elastic Container Service Task**
3. Nombre: `coldtrack-ecs-task-role`

### 3.2 Política de permisos

Adjunta una política inline basada en `infra/ecs-task-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::coldtrack-reports",
        "arn:aws:s3:::coldtrack-reports/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["rds-db:connect"],
      "Resource": "arn:aws:rds-db:us-east-1:TU_ACCOUNT_ID:dbuser:TU_CLUSTER_RESOURCE_ID/postgres"
    }
  ]
}
```

**Obtener el ARN de rds-db:connect:**
```bash
aws rds describe-db-clusters --db-cluster-identifier coldtrack-db --region us-east-1
```
El `DbClusterResourceId` va en el ARN.

---

## Paso 4 — Security Group de RDS

El security group de RDS debe permitir tráfico **5432** desde el security group de las tasks ECS (no desde 0.0.0.0/0).

| Origen | Puerto | Destino |
|--------|--------|---------|
| SG de ECS tasks | 5432 | SG de RDS cluster |

---

## Paso 5 — Preparar tablas en RDS

Desde tu PC (con credenciales AWS configuradas):

```powershell
cd D:\innova-app

# Configura .env con RDS_IAM_AUTH=true y credenciales AWS
npm run db:push
npm run db:seed
```

Esto crea las tablas Prisma y usuarios demo en tu RDS.

---

## Paso 6 — Probar conexión local

```powershell
npm run dev
```

Verificar:
```powershell
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "database": "postgresql",
  "aws": { "configured": true, "region": "us-east-1", "bucket": "coldtrack-reports" }
}
```

Login: `admin@coldtrack.ai` / `password123`

---

## Paso 7 — Probar reportes en S3

Generar reporte de auditoría (desde dashboard o API):

```powershell
curl -X POST http://localhost:3000/api/company/empresa-a/reports `
  -H "Cookie: token=TU_TOKEN"
```

O desde el navegador autenticado. El JSON se sube a:
`s3://coldtrack-reports/reports/{companyId}/{timestamp}-auditoria-{id}.json`

Listar reportes:
```powershell
curl http://localhost:3000/api/company/empresa-a/reports
```

---

## Paso 8 — Desplegar en ECS Fargate

### 8.1 Subir imagen a ECR

```powershell
$REGION = "us-east-1"
$ACCOUNT = (aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name coldtrack --region $REGION

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

docker build -t coldtrack .
docker tag coldtrack:latest "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/coldtrack:latest"
docker push "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/coldtrack:latest"
```

### 8.2 Task Definition — variables de entorno

En ECS Task Definition, **sin access keys**:

| Variable | Valor |
|----------|-------|
| `RDS_IAM_AUTH` | `true` |
| `RDS_HOST` | `coldtrack-db.cluster-ccroq24kgjbk.us-east-1.rds.amazonaws.com` |
| `RDS_PORT` | `5432` |
| `RDS_DATABASE` | `postgres` |
| `RDS_USER` | `postgres` |
| `AWS_REGION` | `us-east-1` |
| `AWS_S3_BUCKET` | `coldtrack-reports` |
| `JWT_SECRET` | *(desde Secrets Manager)* |
| `NODE_ENV` | `production` |

**Task Role:** `coldtrack-ecs-task-role` (del paso 3)

### 8.3 Crear servicio ECS

- Cluster Fargate
- Desired count: 1
- Subnets: **privadas** con NAT (para pull ECR) o públicas con IP asignada
- Load Balancer → puerto 3000
- Health check: `/api/health`

---

## Comando psql con IAM (referencia)

Equivalente a lo que ya tienes:

```bash
export RDSHOST="coldtrack-db.cluster-ccroq24kgjbk.us-east-1.rds.amazonaws.com"
export PGPASSWORD="$(aws rds generate-db-auth-token --hostname $RDSHOST --port 5432 --username postgres --region us-east-1)"

psql "host=$RDSHOST port=5432 dbname=postgres user=postgres sslmode=require password=$PGPASSWORD"
```

La aplicación hace esto automáticamente con `@aws-sdk/rds-signer` y renueva el token cada 12 minutos.

---

## Checklist final

- [ ] IAM DB auth habilitado en RDS
- [ ] `GRANT rds_iam TO postgres` ejecutado
- [ ] Bucket `coldtrack-reports` creado
- [ ] Task Role con permisos S3 + rds-db:connect
- [ ] Security group RDS permite ECS
- [ ] `npm run db:push && npm run db:seed` exitoso
- [ ] `/api/health` muestra `database: postgresql`
- [ ] Reporte subido a S3 verificado en consola
- [ ] Claves AWS expuestas rotadas
