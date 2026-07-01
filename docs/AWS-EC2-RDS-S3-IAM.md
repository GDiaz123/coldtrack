# Despliegue simple en AWS: EC2 + RDS + S3 + IAM

Esta es la ruta mas directa para llevar COLDTRACK a AWS sin montar ECS.

- EC2 corre la app Next.js con Docker.
- RDS PostgreSQL guarda empresas, usuarios, sensores y registro.
- S3 guarda los reportes generados desde `/api/company/[companyId]/reports`.
- IAM Role de EC2 entrega permisos a la instancia sin guardar access keys.

## 1. Crear RDS PostgreSQL

1. AWS Console -> RDS -> Create database.
2. Engine: PostgreSQL.
3. Template: Free tier o Single-AZ si es demo.
4. DB name: `coldtrack`.
5. Username: `coldtrack`.
6. Guarda una password segura.
7. Public access: `No` si EC2 estara en la misma VPC. Para una demo rapida puede ser `Yes`, restringiendo el Security Group solo a tu IP y/o al Security Group de EC2.
8. Cuando este disponible, arma la variable:

```ini
DATABASE_URL="postgresql://coldtrack:TU_PASSWORD@TU_ENDPOINT_RDS:5432/coldtrack?sslmode=require"
DATABASE_DISABLED=false
RDS_SSL=true
```

El registro ya esta preparado para usar PostgreSQL: `app/api/auth/register/route.ts` crea la empresa y el usuario `ADMIN`.

## 2. Crear bucket S3 para reportes

1. AWS Console -> S3 -> Create bucket.
2. Nombre sugerido: `coldtrack-reports-TU-CUENTA`.
3. Block all public access: activado.
4. Versioning: recomendado.

Variables para la app:

```ini
AWS_REGION=us-east-1
AWS_S3_BUCKET=coldtrack-reports-TU-CUENTA
```

La app sube los reportes con este prefijo:

```text
reports/{companyId}/{timestamp}-auditoria-{companyId}.json
```

## 3. Crear IAM Role para EC2

Crear un rol con trust policy para EC2:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Adjunta esta politica minima, cambiando el nombre del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ColdtrackReportsBucketList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::coldtrack-reports-TU-CUENTA",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["reports/*"]
        }
      }
    },
    {
      "Sid": "ColdtrackReportsObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::coldtrack-reports-TU-CUENTA/reports/*"
    }
  ]
}
```

No pongas `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en EC2. El SDK de AWS usara el IAM Role de la instancia automaticamente.

## 4. Crear EC2

1. EC2 -> Launch instance.
2. AMI: Ubuntu 24.04 LTS o Amazon Linux 2023.
3. Tipo: `t3.micro` o `t3.small`.
4. IAM instance profile: selecciona el rol creado.
5. Security Group:
   - SSH 22 solo desde tu IP.
   - HTTP 80 desde Internet.
   - HTTPS 443 desde Internet si configuraras dominio/certificado.
   - Para prueba directa, puedes abrir 3000 temporalmente.
6. En el Security Group de RDS, permite entrada PostgreSQL 5432 desde el Security Group de EC2.

## 5. Instalar Docker en EC2

Ubuntu:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
```

Clona el proyecto y crea `.env.production`:

```bash
git clone TU_REPO innova-app
cd innova-app
nano .env.production
```

Contenido:

```ini
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL="http://TU_IP_O_DOMINIO"
JWT_SECRET="genera-un-secreto-largo-y-aleatorio"
DATABASE_URL="postgresql://coldtrack:TU_PASSWORD@TU_ENDPOINT_RDS:5432/coldtrack?sslmode=require"
RDS_SSL=true
AWS_REGION=us-east-1
AWS_S3_BUCKET=coldtrack-reports-TU-CUENTA
SENSOR_PROVIDER=simulated
RUN_DEMO_SEED=false
DB_HEALTH_TIMEOUT_MS=4000
```

Si RDS todavia no esta listo, deja `DATABASE_DISABLED=true`. La app correra en modo demo con datos en memoria; el registro quedara deshabilitado hasta que actives PostgreSQL.

Levanta la app:

```bash
docker build -t coldtrack .
docker run -d --name coldtrack --restart unless-stopped --env-file .env.production -p 3000:3000 coldtrack
docker logs -f coldtrack
```

Inicializa la base si aun no existen tablas/datos:

```bash
docker exec -it coldtrack npx prisma db push
docker exec -it coldtrack npm run db:seed
```

## 6. Proxy simple con Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/coldtrack
```

Config:

```nginx
server {
  listen 80;
  server_name TU_DOMINIO_O_IP;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
  }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/coldtrack /etc/nginx/sites-enabled/coldtrack
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Roles de la app vs roles de IAM

Hay dos niveles distintos:

- Roles de aplicacion: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `TECHNICIAN`, `AUDITOR`. Estan en Prisma y controlan lo que ve/hace cada usuario dentro de COLDTRACK.
- IAM Role de EC2: controla lo que la maquina puede hacer en AWS. Para empezar, solo necesita escribir/listar/leer objetos de S3 en `reports/*`.

Para una demo simple, usa `DATABASE_URL` con password de RDS y deja IAM solo para S3. Si luego quieres autenticacion IAM para RDS, la app ya tiene soporte parcial con `RDS_IAM_AUTH=true`, `RDS_HOST`, `RDS_USER`, `RDS_DATABASE` y el permiso `rds-db:connect`.
