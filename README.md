# COLDTRACK AI+ — Plataforma de Control de Cadena de Frío

Este proyecto es una plataforma profesional para el monitoreo en tiempo real de la cadena de frío, diseñada para garantizar el almacenamiento seguro de vacunas, reactivos, hemoderivados y muestras biológicas en establecimientos de salud.

---

## Arquitectura del Proyecto

El sistema está estructurado bajo una arquitectura de capas desacopladas, lo que permite un mantenimiento limpio y la futura transición a servicios e integraciones físicas de hardware sin romper el sistema de presentación:

```mermaid
graph TD
    A[Frontend React Client Components] -->|Fetch / SSE| B[API Route Handlers app/api]
    B -->|Interfaz ColdtrackRepository| C[Server Layer lib/server]
    C -->|SimulatedSensorProvider| D[ISensorProvider Interface]
    D -.->|Futuro: Hardware real| E[MQTTSensorProvider / AWS IoT Core]
    C -->|Tipos Puros| F[Domain Layer lib/domain]
```

1. **Domain Layer (`lib/domain/`)**: Tipos puros que definen los modelos de datos de la aplicación (`Company`, `Sensor`, `AppUser`, `SensorReading`, `SystemEvent`). No contiene efectos secundarios ni dependencias externas.
2. **Server Layer (`lib/server/`)**: Capa lógica del backend que implementa el patrón Repository (`MemoryColdtrackRepository`). Alberga la gestión del estado in-memory y el sensor provider desacoplado.
3. **API Routes (`app/api/`)**: Controladores de ruta de Next.js que exponen las operaciones HTTP (CRUD de empresas, usuarios y sensores) y los flujos Server-Sent Events (SSE) para actualizaciones en tiempo real.
4. **Frontend Layer**: Vistas modulares desarrolladas con React Server/Client Components y estilizadas con Tailwind CSS.

---

## Estructura de Carpetas

```text
├── app/
│   ├── admin/                 # Rutas de administración general
│   ├── api/                   # API Route Handlers (Auth, Admin, Company)
│   ├── dashboard/             # Panel de cliente por compañía (/dashboard/[companyId])
│   ├── globals.css            # Estilos globales y Tailwind CSS
│   ├── layout.tsx             # Layout raíz del proyecto
│   └── page.tsx               # Página de inicio y login
├── components/
│   ├── admin/                 # Componentes visuales de administración
│   ├── ui/                    # Componentes base (shadcn/button)
│   └── coldtrack-dashboard.tsx# Dashboard principal de cliente
├── lib/
│   ├── domain/                # Modelos y lógica pura de negocio
│   ├── hooks/                 # Custom hooks (Auth, Admin, Company)
│   └── server/                # Repositorio in-memory y lógica del backend
├── Dockerfile                 # Dockerfile de producción multi-stage
├── docker-compose.yml         # Despliegue local y de prueba
└── package.json               # Dependencias del proyecto
```

---

## Documentación del proyecto

- **[Informe de Proyecto Final](docs/INFORME-PROYECTO-FINAL.md)** — Documento completo para entregar al curso
- **[Configuración AWS RDS + IAM + S3 + ECS](docs/AWS-RDS-ECS-CONFIG.md)** — Conectar tu cluster RDS y bucket S3
- **[Despliegue simple EC2 + RDS + S3 + IAM](docs/AWS-EC2-RDS-S3-IAM.md)** — Ruta directa para subir la app a EC2 con Docker

---

## Variables de Entorno

Copie el archivo `.env.example` como `.env` y configure las siguientes variables:

```ini
# Configuración del servidor
APP_NAME="COLDTRACK AI+"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_COMPANY_ID="empresa-a"
LOG_LEVEL="info"

# Autenticación
JWT_SECRET="cambiar-por-secreto-seguro"

# Base de datos PostgreSQL (requerido para registro)
DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack"

# Proveedor de sensores
SENSOR_PROVIDER="simulated"
```

---

## Cómo Ejecutar el Proyecto

### Localmente (Desarrollo)
1. Instale las dependencias:
   ```bash
   npm install
   ```
2. Copie `.env.example` a `.env` y configure `DATABASE_URL`.
3. Inicie PostgreSQL (con Docker):
   ```bash
   docker compose up db -d
   ```
4. Aplique el esquema y datos demo:
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. Ejecute el servidor de desarrollo:
   ```bash
   npm run dev
   ```
6. Abra [http://localhost:3000](http://localhost:3000). Use `/register` para crear una cuenta nueva.

### Con Docker (producción local)
1. Construya la imagen y levante los contenedores:
   ```bash
   docker compose up --build
   ```
2. La aplicación estará disponible en [http://localhost:3000](http://localhost:3000). El contenedor aplica migraciones y seed automáticamente al iniciar.

---

## Explicación del Backend y del Frontend

### Backend
* **Rutas RESTful**: La API provee endpoints limpios bajo `/api/admin/*` y `/api/company/[companyId]/*` para la creación y manipulación de entidades.
* **Server-Sent Events (SSE)**: En lugar de WebSockets (que requieren un servidor WebSocket dedicado), la aplicación aprovecha las capacidades nativas de streaming de Next.js a través de SSE (`/api/company/[companyId]/stream` y `/api/admin/stream`) para transmitir lecturas y eventos cada 3 segundos.

### Frontend
* **Autenticación Basada en Roles**: Los accesos a las rutas se controlan en el cliente mediante el hook personalizado `useAuth()`. Si el usuario inicia sesión como `SUPER_ADMIN`, se le redirige y valida para `/admin`. Si es un operador de empresa, se le restringe al `/dashboard/[companyId]` correspondiente a su pertenencia organizacional.
* **Hooks de Suscripción**: `useCompanyDashboard` y `useAdminDashboard` se encargan de gestionar el ciclo de vida de la conexión SSE y realizar el fetch inicial, actualizando el estado de forma transparente sin refrescar la página.

---

## Motor de Simulación Realista

Para evitar comportamientos artificiales, el `SimulatedSensorProvider` implementa un modelo de simulación física con las siguientes características:
* **Inercia Térmica**: La temperatura no oscila bruscamente; evoluciona de forma incremental hacia la media del umbral térmico del sensor.
* **Deriva (Drift) Gradual**: Se simula la pérdida o ganancia lenta de frío/calor a través del tiempo mediante un algoritmo de desplazamiento suave.
* **Pérdida Ocasional de Conexión**: Un sensor tiene un 1.5% de probabilidad por tick de entrar en modo `OFFLINE` simulando interferencia temporal, recuperándose de forma autónoma después de algunos segundos.
* **Descarga de Batería**: Disminuye de forma realista en función de la telemetría enviada.
* **Alertas**: Se generan eventos solo ante desviaciones sostenidas y reales de los parámetros.

---

## Procedimientos de Administración

### Cómo agregar nuevos sensores
Cada empresa puede registrar sensores en caliente desde el dashboard operativo:
1. Inicie sesión con un usuario de la empresa (ej. `valeria@santaaurora.pe`).
2. Diríjase a la sección **"Gestión de Sensores"**.
3. Haga clic en **"Registrar Sensor"** y complete el código identificador (ej: `RF-09`), nombre, ubicación, tipo de producto y rango límite.
4. El sensor aparecerá automáticamente en el listado y el motor de telemetría comenzará a simularlo al instante.

### Cómo agregar nuevas empresas y usuarios
Desde la cuenta de administrador general:
1. Inicie sesión en la plataforma con el correo `admin@coldtrack.ai` y contraseña `password123`.
2. Vaya a la sección **"Empresas"** y haga clic en **"Registrar Empresa"**.
3. Vaya a la sección **"Usuarios"** para crear accesos asignándoles la empresa correspondiente y su rol respectivo.

---

# Preparación para AWS

El proyecto ha sido diseñado con un desacoplamiento de capas para facilitar su migración directa a una arquitectura serverless o contenerizada en AWS.

### 1. Servicios de AWS Recomendados
* **AWS ECS (Fargate)**: Para hospedar la aplicación Next.js de forma contenerizada sin gestionar servidores EC2 (utilizando el `Dockerfile` provisto).
* **Amazon RDS (PostgreSQL)**: Para reemplazar el repositorio in-memory por una base de datos relacional persistente, utilizando el ORM **Prisma** ya integrado en el proyecto.
* **AWS IoT Core**: Para la ingesta y transmisión de telemetría de sensores reales (ESP32, Arduino, gateways industriales) a través del protocolo MQTT.
* **Amazon S3**: Para el almacenamiento y distribución de reportes de auditoría exportados y assets estáticos.
* **Amazon CloudFront**: CDN para acelerar la carga del frontend y asegurar el tráfico por HTTPS.
* **AWS IAM**: Para restringir privilegios y asegurar que los servicios (como ECS) solo accedan a los recursos permitidos.

### 2. Cómo Desplegar el Backend y Frontend (EC2 / ECS)
Aunque se puede utilizar una instancia EC2 clásica configurando Docker y Nginx, la recomendación de producción es utilizar **AWS ECS Fargate**:
1. Cree un repositorio en **Amazon ECR** (Elastic Container Registry) y suba la imagen construida con el `Dockerfile` del proyecto.
2. Defina una **Task Definition** en ECS especificando las variables de entorno de producción (`DATABASE_URL`, `SENSOR_PROVIDER="real"`, `JWT_SECRET`, etc.).
3. Configure un **Application Load Balancer (ALB)** delante de ECS para gestionar la terminación SSL/TLS y redirigir el tráfico del puerto 80/443 al puerto 3000 de los contenedores.
4. Si utiliza **EC2 Tradicional**: Levante el proyecto mediante `docker-compose up -d` y configure un proxy inverso en Nginx para redireccionar el puerto 80 al puerto 3000, asegurando la directiva `proxy_set_header Connection "keep-alive"` para que el stream de SSE no se desconecte.

### 3. Conexión de AWS IoT Core en el Futuro
Para conectar hardware real (sensores físicos transmitiendo por MQTT):
1. Registre las "Cosas" (Things) en la consola de **AWS IoT Core** y genere los certificados X.509 necesarios para cada dispositivo físico.
2. Cree una regla de AWS IoT Core para retransmitir los mensajes entrantes del topic MQTT (ej: `coldtrack/telemetry`) a una cola de **Amazon SQS** o invocar una **AWS Lambda**.
3. **Modificación de Código**: Reemplace el `SimulatedSensorProvider` en el backend. Cree una nueva clase `AWSIoTSensorProvider` que implemente la interfaz `ISensorProvider` (ubicada en `lib/server/coldtrack-store.ts`) para leer los datos más recientes desde la cola SQS o base de datos en lugar de generarlos en memoria:
   ```typescript
   export class AWSIoTSensorProvider implements ISensorProvider {
     async tick(companyId?: string) {
       // Consultar telemetría real desde la base de datos o AWS SQS
     }
     getReading(sensor: Sensor): SensorReading {
       // Retornar lectura en base a los últimos datos reales del dispositivo
     }
   }
   ```
4. Actualice la variable de entorno `SENSOR_PROVIDER="aws"` e inicialice esta clase en el factory del repositorio.

### 4. Buenas Prácticas para Producción en AWS
* **Secretos Seguros**: Utilice **AWS Secrets Manager** o **Systems Manager Parameter Store** para inyectar claves de API, secretos JWT y credenciales de bases de datos. Nunca almacene secretos en el archivo `.env` del repositorio git.
* **VPC Privada**: La base de datos de RDS y las tareas de ECS del backend deben residir en subredes privadas. Solo el balanceador de carga y la distribución de CloudFront deben tener exposición pública.
* **Keep-Alive en Balanceadores de Carga**: Los balances de carga de AWS tienen un timeout de inactividad de 60 segundos por defecto. Para asegurar que las conexiones SSE sigan abiertas, verifique que el intervalo de keep-alive en el stream (`/api/company/[companyId]/stream`) envíe pings periódicos inferiores a ese límite (el proyecto ya envía pings cada 15 segundos).
