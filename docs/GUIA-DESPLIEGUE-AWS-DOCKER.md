# Guía paso a paso: Docker + AWS — COLDTRACK

Esta guía explica cómo levantar el proyecto localmente con Docker y desplegarlo en AWS para el informe del proyecto final.

---

## Parte 1 — Requisitos previos

### En tu PC (Windows)

1. Instalar **Node.js 20+**: https://nodejs.org
2. Instalar **Git**: https://git-scm.com
3. Instalar **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   - Durante la instalación, activar **WSL 2** si lo pide Windows.
   - Reiniciar el PC después de instalar.
   - Abrir Docker Desktop y esperar a que diga **"Docker is running"**.

### Verificar instalación

```powershell
node -v
npm -v
docker --version
docker compose version
```

---

## Parte 2 — Desarrollo local SIN Docker (modo demo rápido)

Útil para probar la interfaz y el login sin base de datos.

```powershell
cd D:\innova-app
npm install
```

Asegúrate de que en `.env` la línea `DATABASE_URL` esté **comentada**:

```ini
# DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack"
```

```powershell
npm run dev
```

Abre http://localhost:3000 e inicia sesión con:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin global | admin@coldtrack.ai | password123 |
| Clínica | valeria@santaaurora.pe | password123 |

> El registro (`/register`) **requiere** PostgreSQL. En modo demo solo funciona el login.

---

## Parte 3 — Desarrollo local CON Docker + PostgreSQL

### Paso 1: Levantar solo la base de datos

```powershell
cd D:\innova-app
docker compose up db -d
```

Verificar que esté corriendo:

```powershell
docker compose ps
```

Debe mostrar el servicio `db` en estado **healthy**.

### Paso 2: Configurar `.env`

Descomenta `DATABASE_URL` en `.env`:

```ini
DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack"
```

### Paso 3: Crear tablas y datos demo

```powershell
npm run db:push
npm run db:seed
```

Deberías ver: `Seed completado: planes, empresas y usuarios demo.`

### Paso 4: Iniciar la app

```powershell
npm run dev
```

### Paso 5: Probar registro

1. Ir a http://localhost:3000/register
2. Completar el formulario con una empresa nueva
3. Deberías entrar al dashboard automáticamente

### Paso 6: Verificar salud del sistema

```powershell
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "database": "postgresql",
  ...
}
```

Si dice `"database": "postgresql-unavailable"`, PostgreSQL no está accesible. Revise Docker.

---

## Parte 4 — Todo con Docker (app + base de datos)

Levanta la aplicación completa en contenedores (similar a producción):

```powershell
cd D:\innova-app
docker compose up --build
```

La primera vez tarda varios minutos (descarga imágenes, compila Next.js, aplica esquema y seed).

Cuando termine, abre http://localhost:3000

Para detener:

```powershell
docker compose down
```

Para detener y borrar datos de la BD:

```powershell
docker compose down -v
```

---

## Parte 5 — Solución de problemas comunes

### Error: `Authentication failed against the database server`

**Causa:** `DATABASE_URL` está en `.env` pero PostgreSQL no corre o las credenciales no coinciden.

**Solución A (rápida — modo demo):**
Comenta `DATABASE_URL` en `.env` y reinicia `npm run dev`.

**Solución B (con base de datos):**
```powershell
docker compose up db -d
npm run db:push
npm run db:seed
```

### Error: `docker` no se reconoce

Docker Desktop no está instalado o no está en el PATH. Instálalo y reinicia la terminal.

### Login no funciona / credenciales incorrectas

- Modo memoria: contraseña siempre es `password123`
- Modo PostgreSQL: ejecuta `npm run db:seed` para recrear usuarios demo

### Registro devuelve 503

PostgreSQL no está disponible. Sigue la Parte 3.

---

## Parte 6 — Despliegue en AWS (paso a paso)

Arquitectura recomendada para el informe del proyecto:

```
Internet
   │
   ▼
Application Load Balancer (HTTPS)
   │
   ▼
ECS Fargate (contenedor Docker de COLDTRACK)
   │
   ▼
Amazon RDS PostgreSQL (base de datos)
   │
   ▼
AWS Secrets Manager (JWT_SECRET, DATABASE_URL)
```

### Paso 1: Crear cuenta AWS

1. Ir a https://aws.amazon.com
2. Crear cuenta (requiere tarjeta; capa gratuita disponible 12 meses)
3. Acceder a la **Consola AWS**

### Paso 2: Crear base de datos RDS PostgreSQL

1. Consola AWS → **RDS** → **Create database**
2. Configuración:
   - Engine: **PostgreSQL 16**
   - Template: **Free tier** (si disponible)
   - DB instance identifier: `coldtrack-db`
   - Master username: `coldtrack`
   - Master password: *(genera una segura y guárdala)*
   - Database name: `coldtrack`
   - Public access: **No** (más seguro)
   - VPC: default
3. Crear y esperar estado **Available**
4. Anotar el **Endpoint** (ej: `coldtrack-db.xxxxx.us-east-1.rds.amazonaws.com`)
5. URL de conexión:
   ```
   postgresql://coldtrack:TU_PASSWORD@endpoint:5432/coldtrack
   ```

### Paso 3: Guardar secretos en Secrets Manager

1. Consola AWS → **Secrets Manager** → **Store a new secret**
2. Tipo: **Other type of secret**
3. Agregar pares clave-valor:
   - `DATABASE_URL` → URL de RDS del paso anterior
   - `JWT_SECRET` → cadena aleatoria larga (mín. 32 caracteres)
4. Nombre del secreto: `coldtrack/production`
5. Crear

### Paso 4: Crear repositorio ECR (imágenes Docker)

```powershell
# Reemplaza REGION y ACCOUNT_ID con los tuyos
$REGION = "us-east-1"
$ACCOUNT_ID = "123456789012"

aws ecr create-repository --repository-name coldtrack --region $REGION
```

Autenticarse en ECR:

```powershell
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
```

Construir y subir imagen:

```powershell
cd D:\innova-app
docker build -t coldtrack .
docker tag coldtrack:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/coldtrack:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/coldtrack:latest
```

### Paso 5: Crear cluster ECS

1. Consola AWS → **ECS** → **Create cluster**
2. Nombre: `coldtrack-cluster`
3. Infrastructure: **AWS Fargate**
4. Crear

### Paso 6: Task Definition

1. ECS → **Task definitions** → **Create new**
2. Nombre: `coldtrack-task`
3. Launch type: **Fargate**
4. CPU: 0.5 vCPU, Memory: 1 GB
5. Container:
   - Name: `coldtrack-app`
   - Image URI: `$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/coldtrack:latest`
   - Port: **3000**
   - Environment variables (desde Secrets Manager):
     - `DATABASE_URL` → secret `coldtrack/production`
     - `JWT_SECRET` → secret `coldtrack/production`
     - `NODE_ENV` → `production`
     - `NEXT_PUBLIC_APP_URL` → URL pública de tu ALB
6. Crear

### Paso 7: Application Load Balancer

1. Consola AWS → **EC2** → **Load Balancers** → **Create**
2. Tipo: **Application Load Balancer**
3. Scheme: **Internet-facing**
4. Listener: HTTP 80 (HTTPS 443 si tienes certificado ACM)
5. Target group: puerto **3000**, health check path `/api/health`
6. Crear

### Paso 8: Crear servicio ECS

1. ECS → cluster `coldtrack-cluster` → **Create service**
2. Launch type: Fargate
3. Task definition: `coldtrack-task`
4. Desired tasks: 1
5. VPC y subnets: públicas para ALB, privadas para tasks (recomendado)
6. Load balancer: seleccionar ALB creado, target group puerto 3000
7. Crear servicio

### Paso 9: Configurar Security Groups

| Recurso | Puerto | Origen |
|---------|--------|--------|
| ALB | 80/443 | 0.0.0.0/0 (internet) |
| ECS tasks | 3000 | Security group del ALB |
| RDS | 5432 | Security group de ECS tasks |

### Paso 10: Verificar despliegue

1. Copiar DNS del ALB (ej: `coldtrack-alb-xxxxx.us-east-1.elb.amazonaws.com`)
2. Abrir en navegador: `http://DNS-DEL-ALB`
3. Probar login y `/api/health`

---

## Parte 7 — Alternativa simple: EC2 + Docker Compose

Si ECS es demasiado complejo para el curso, puedes usar una instancia EC2:

### Paso 1: Crear instancia EC2

1. Consola AWS → **EC2** → **Launch instance**
2. AMI: **Amazon Linux 2023** o **Ubuntu 22.04**
3. Tipo: **t3.micro** (free tier)
4. Key pair: crear y descargar `.pem`
5. Security group: abrir puertos **22** (SSH) y **80** (HTTP)
6. Lanzar

### Paso 2: Conectar por SSH

```powershell
ssh -i "tu-clave.pem" ec2-user@IP-PUBLICA-EC2
```

### Paso 3: Instalar Docker en EC2

```bash
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Cerrar sesión y volver a entrar por SSH.

### Paso 4: Clonar y desplegar

```bash
git clone https://github.com/TU-USUARIO/innova-app.git
cd innova-app
```

Editar `.env` con credenciales de RDS (o usar PostgreSQL en el mismo compose para demo):

```bash
nano .env
```

```powershell
docker compose up -d --build
```

### Paso 5: Acceder

Abrir `http://IP-PUBLICA-EC2:3000` en el navegador.

> Para producción real, pon Nginx delante en puerto 80 redirigiendo a 3000.

---

## Parte 8 — Checklist para el informe del proyecto

- [ ] Captura de Docker Desktop con contenedores corriendo
- [ ] Captura de `docker compose ps` mostrando servicios healthy
- [ ] Captura de login exitoso en localhost
- [ ] Captura de registro de nueva organización
- [ ] Captura de dashboard con sensores
- [ ] Captura de consola RDS con instancia Available
- [ ] Captura de ECS service Running o EC2 con app accesible
- [ ] Captura de `/api/health` respondiendo `"database": "postgresql"`
- [ ] Diagrama de arquitectura AWS (ver `docs/INFORME-PROYECTO-FINAL.md`)

---

## Comandos de referencia rápida

```powershell
# Desarrollo sin BD
npm run dev

# Levantar solo PostgreSQL
docker compose up db -d

# Preparar base de datos
npm run db:push
npm run db:seed

# App completa en Docker
docker compose up --build

# Ver logs
docker compose logs -f app

# Reiniciar todo
docker compose down && docker compose up --build
```
