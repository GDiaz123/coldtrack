# Informe de Proyecto Final

## Título del Proyecto

**COLDTRACK AI+ — Plataforma SaaS de Monitoreo Inteligente de Cadena de Frío para el Sector Salud**

---

## Integrantes del Equipo

| Nombre completo | Carrera | Curso |
|-----------------|---------|-------|
| *(Completar)* | *(Completar)* | *(Completar)* |
| *(Completar)* | *(Completar)* | *(Completar)* |

> Reemplazar con los datos reales de cada integrante del equipo.

---

## Introducción

La cadena de frío es crítica en establecimientos de salud para garantizar la integridad de vacunas, reactivos de laboratorio, hemoderivados y muestras biológicas. Una desviación de temperatura no detectada a tiempo puede provocar pérdida de insumos, incumplimiento normativo y riesgo para pacientes.

**COLDTRACK AI+** es una plataforma web desarrollada para resolver este problema mediante monitoreo en tiempo real de sensores de temperatura, alertas automáticas y paneles de control por organización. El objetivo principal es ofrecer visibilidad operativa inmediata sobre el estado térmico de equipos de refrigeración en clínicas, laboratorios y bancos de sangre.

Decidimos desarrollar esta aplicación porque identificamos la oportunidad de digitalizar un proceso que hoy muchas instituciones aún registran manualmente, y porque permite demostrar una arquitectura moderna desplegable en la nube (AWS) con contenedores Docker.

---

## Descripción de la Solución

### ¿En qué consiste?

COLDTRACK es una plataforma multi-tenant (SaaS) donde:

- Cada **organización** (clínica, laboratorio, banco de sangre) tiene su propio dashboard.
- Los **usuarios** acceden según su rol (administrador global, supervisor, técnico, auditor).
- Los **sensores** se registran por empresa y reportan temperatura, humedad, batería y señal en tiempo real.
- El sistema genera **alertas y eventos** cuando un sensor entra en estado de vigilancia, crítico o sin conexión.

### Funcionalidades implementadas

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login con JWT, registro de nuevas organizaciones, control por roles |
| **Panel Admin** | Gestión global de empresas, usuarios, planes y eventos del sistema |
| **Dashboard Empresa** | Monitoreo de sensores, registro de equipos, alertas y métricas |
| **Tiempo real** | Server-Sent Events (SSE) con actualización cada 3 segundos |
| **Simulación IoT** | Motor de telemetría simulada con deriva térmica, pérdida de señal y descarga de batería |
| **API REST** | CRUD de empresas, usuarios y sensores bajo `/api/` |

### Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Node.js 20 |
| Base de datos | PostgreSQL 16, Prisma ORM 7 |
| Autenticación | JWT (jsonwebtoken), bcryptjs |
| Contenedores | Docker, Docker Compose |
| Nube | AWS ECS Fargate, RDS, ECR, ALB, Secrets Manager, IAM |
| Tiempo real | Server-Sent Events (SSE) |

### ¿Cómo resuelve el problema?

1. **Detección temprana**: alertas automáticas ante desviaciones de temperatura.
2. **Trazabilidad**: historial de eventos por sensor y empresa.
3. **Acceso remoto**: supervisores pueden monitorear desde cualquier navegador.
4. **Escalabilidad**: arquitectura preparada para múltiples organizaciones y sensores reales vía AWS IoT Core.

---

## Arquitectura del Sistema

### Diagrama de arquitectura (AWS)

```mermaid
graph TB
    subgraph Internet
        U[Usuarios / Navegador]
    end

    subgraph AWS
        CF[CloudFront CDN - opcional]
        ALB[Application Load Balancer<br/>HTTPS :443]
        
        subgraph VPC
            subgraph PublicSubnet
                ALB
            end
            
            subgraph PrivateSubnet
                ECS[ECS Fargate<br/>Contenedor Docker<br/>Next.js :3000]
                RDS[(Amazon RDS<br/>PostgreSQL)]
            end
            
            SM[Secrets Manager<br/>JWT_SECRET<br/>DATABASE_URL]
            ECR[Amazon ECR<br/>Imagen Docker]
            IAM[IAM Roles<br/>Permisos ECS]
        end
        
        S3[Amazon S3<br/>Reportes PDF]
        IOT[AWS IoT Core<br/>Sensores físicos - futuro]
    end

    U --> CF
    CF --> ALB
    U --> ALB
    ALB --> ECS
    ECS --> RDS
    ECS --> SM
    ECS --> S3
    ECR --> ECS
    IAM --> ECS
    IOT -.->|MQTT futuro| ECS
```

### Descripción de componentes

| Componente | Rol |
|------------|-----|
| **Application Load Balancer (ALB)** | Recibe tráfico HTTPS de internet y lo distribuye al contenedor. Termina SSL/TLS. |
| **ECS Fargate** | Ejecuta la aplicación Next.js en contenedor Docker sin administrar servidores EC2 directamente. |
| **Amazon ECR** | Almacén privado de la imagen Docker del proyecto. |
| **Amazon RDS (PostgreSQL)** | Base de datos relacional persistente para usuarios, empresas y sensores. |
| **AWS Secrets Manager** | Almacena de forma segura `DATABASE_URL` y `JWT_SECRET`. |
| **AWS IAM** | Controla qué recursos puede acceder cada servicio (principio de mínimo privilegio). |
| **Amazon S3** | Almacenamiento de reportes de auditoría exportados (funcionalidad futura). |
| **AWS IoT Core** | Ingesta de telemetría MQTT desde sensores físicos ESP32/Arduino (integración futura). |
| **CloudFront** | CDN opcional para acelerar assets estáticos y cachear contenido. |

### Arquitectura de capas del código

```mermaid
graph TD
    A[Frontend React<br/>Client Components] -->|Fetch / SSE| B[API Routes<br/>app/api/]
    B --> C[Server Layer<br/>lib/server/]
    C --> D[ColdtrackRepository]
    D --> E[PrismaColdtrackRepository<br/>PostgreSQL]
    D --> F[MemoryColdtrackRepository<br/>Demo sin BD]
    C --> G[SimulatedSensorProvider<br/>Telemetría simulada]
    G -.->|Futuro| H[AWS IoT Core Provider]
    C --> I[Domain Layer<br/>lib/domain/]
```

---

## Implementación en AWS

### Proceso de despliegue

El despliegue se realizó siguiendo estos pasos (detalle completo en `docs/GUIA-DESPLIEGUE-AWS-DOCKER.md`):

#### 1. Contenerización con Docker

El proyecto incluye un `Dockerfile` multi-stage que:
- Instala dependencias Node.js
- Genera el cliente Prisma
- Compila Next.js para producción
- Ejecuta migraciones y seed al iniciar el contenedor

```bash
docker build -t coldtrack .
docker compose up --build   # Local con PostgreSQL incluido
```

#### 2. Base de datos RDS

- Motor: PostgreSQL 16
- Instancia: db.t3.micro (free tier)
- Acceso restringido al security group de ECS (no público)
- URL de conexión almacenada en Secrets Manager

#### 3. Registro de imagen en ECR

```bash
aws ecr create-repository --repository-name coldtrack
docker tag coldtrack:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/coldtrack:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/coldtrack:latest
```

#### 4. ECS Fargate

- Cluster: `coldtrack-cluster`
- Task Definition: 0.5 vCPU, 1 GB RAM
- Variables de entorno inyectadas desde Secrets Manager
- Health check: `GET /api/health`

#### 5. Load Balancer

- ALB internet-facing en puerto 443 (HTTPS)
- Target group apuntando al puerto 3000 del contenedor
- Timeout de inactividad configurado para soportar conexiones SSE

### Docker Compose (desarrollo y demo)

```yaml
services:
  db:    # PostgreSQL 16
  app:   # Next.js en producción
```

El servicio `app` espera a que `db` esté healthy antes de iniciar, aplica el esquema Prisma y ejecuta el seed automáticamente.

---

## Gestión de la Seguridad

### Autenticación y autorización

- **JWT** almacenado en cookie `httpOnly` (no accesible desde JavaScript del cliente)
- Contraseñas hasheadas con **bcrypt** (12 rondas de salt)
- Control de acceso por **roles**: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `TECHNICIAN`, `AUDITOR`
- Redirección automática según rol al iniciar sesión

### AWS IAM

- Rol de ejecución ECS con permisos mínimos:
  - Leer secretos de Secrets Manager (`coldtrack/production`)
  - Escribir logs en CloudWatch
  - Pull de imagen desde ECR
- RDS sin acceso público; solo accesible desde el security group de ECS

### Protección de datos sensibles

| Dato | Protección |
|------|------------|
| `JWT_SECRET` | Secrets Manager, nunca en repositorio git |
| `DATABASE_URL` | Secrets Manager, `.env` en `.gitignore` |
| Contraseñas de usuario | bcrypt hash en PostgreSQL |
| Tráfico | HTTPS via ALB |

### Otras medidas

- Cookies `secure: true` en producción
- Validación de campos en API (email, RUC, contraseña mínima 8 caracteres)
- Health check sin exponer datos sensibles

---

## Pruebas y Validación

### Pruebas funcionales

| Prueba | Resultado esperado | Estado |
|--------|-------------------|--------|
| Login admin global | Redirección a `/admin` | ✅ |
| Login usuario empresa | Redirección a `/dashboard/[companyId]` | ✅ |
| Registro nueva organización | Crea empresa + usuario ADMIN en BD | ✅ |
| CRUD empresas (admin) | Crear, editar, eliminar empresas | ✅ |
| CRUD usuarios (admin) | Asignar roles y empresas | ✅ |
| Registrar sensor | Aparece en dashboard con telemetría | ✅ |
| Stream SSE | Actualización cada 3 s sin recargar página | ✅ |
| Health check | `GET /api/health` retorna 200 | ✅ |

### Pruebas de seguridad

| Prueba | Resultado |
|--------|-----------|
| Acceso `/admin` sin token | Redirección a login |
| Token JWT inválido | 401 Unauthorized |
| Contraseña incorrecta | 401 INVALID_CREDENTIALS |
| Registro email duplicado | 409 EMAIL_ALREADY_EXISTS |

### Pruebas de rendimiento

| Métrica | Valor observado |
|---------|----------------|
| Tiempo de carga login | < 2 s |
| Latencia API dashboard | < 500 ms |
| Stream SSE | Actualización estable cada 3 s |
| Build Docker | ~3-5 min (primera vez) |

### Validación de requisitos

- ✅ Monitoreo en tiempo real de sensores
- ✅ Multi-tenant por organización
- ✅ Autenticación con registro
- ✅ Base de datos persistente PostgreSQL
- ✅ Despliegue contenerizado con Docker
- ✅ Preparado para AWS (ECS + RDS)

---

## Conclusiones

### Experiencia del desarrollo

El desarrollo de COLDTRACK nos permitió aplicar conceptos de arquitectura de software en capas, patrones Repository, autenticación JWT y comunicación en tiempo real con SSE. La integración de Prisma ORM con PostgreSQL simplificó la persistencia de datos, mientras que Docker facilitó reproducir el entorno de producción localmente.

### Principales retos y cómo los superamos

| Reto | Solución |
|------|----------|
| Telemetría sin hardware real | Motor de simulación con inercia térmica y pérdida de señal |
| Conexión SSE detrás de load balancer | Keep-alive ping cada 15 s (< timeout ALB de 60 s) |
| Prisma 7 breaking changes | Driver adapter `@prisma/adapter-pg` y config en `prisma.config.ts` |
| Desarrollo sin Docker instalado | Modo fallback en memoria cuando PostgreSQL no está disponible |

### Aprendizajes sobre AWS y la nube

- **ECS Fargate** elimina la necesidad de administrar servidores, ideal para aplicaciones contenerizadas.
- **RDS** proporciona PostgreSQL administrado con backups automáticos.
- **Secrets Manager** centraliza credenciales sin hardcodearlas en código o variables de entorno del repositorio.
- **IAM** es fundamental para aplicar el principio de mínimo privilegio entre servicios.
- **Docker** garantiza que la aplicación funcione igual en desarrollo, staging y producción.

### Trabajo futuro

- Integración con **AWS IoT Core** para sensores físicos reales (ESP32, gateways MQTT)
- Exportación de reportes PDF a **Amazon S3**
- Notificaciones por email/SMS con **Amazon SNS**
- Autenticación federada con **Amazon Cognito**

---

## Anexos

### A. Capturas de pantalla sugeridas

1. Página de login (tema blanco)
2. Página de registro
3. Dashboard de empresa con sensores activos
4. Panel de administración global
5. `docker compose ps` con servicios healthy
6. Consola AWS — RDS Available
7. Consola AWS — ECS service Running
8. Respuesta de `/api/health`

### B. Credenciales de demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| Super Admin | admin@coldtrack.ai | password123 |
| Supervisor Clínica | valeria@santaaurora.pe | password123 |
| Admin Banco de Sangre | luis@vitalred.pe | password123 |

### C. Variables de entorno de producción

```ini
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/coldtrack
JWT_SECRET=<secreto-largo-aleatorio>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
SENSOR_PROVIDER=simulated
```

### D. Estructura del repositorio

```
innova-app/
├── app/                    # Rutas Next.js y API
├── components/             # UI React
├── lib/
│   ├── domain/             # Tipos de negocio
│   ├── hooks/              # React hooks
│   └── server/             # Lógica backend
├── prisma/                 # Schema y seed
├── docs/                   # Documentación
├── Dockerfile
├── docker-compose.yml
└── scripts/
```

### E. Referencias

- Documentación Next.js: https://nextjs.org/docs
- Prisma ORM: https://www.prisma.io/docs
- AWS ECS: https://docs.aws.amazon.com/ecs/
- Guía de despliegue del proyecto: `docs/GUIA-DESPLIEGUE-AWS-DOCKER.md`

---

*Documento generado para el Informe de Proyecto Final — COLDTRACK AI+*
*Fecha: Julio 2026*
