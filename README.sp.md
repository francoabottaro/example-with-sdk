# API de ejemplo con Cloudinary (NestJS)

English: [README.md](README.md)

API REST de ejemplo construida con [NestJS](https://nestjs.com/) y el [SDK oficial de Cloudinary para Node.js](https://cloudinary.com/documentation/node_integration). Persiste metadatos de imágenes en SQLite mediante TypeORM e incluye pruebas unitarias y end-to-end.

## Requisitos

- [Node.js](https://nodejs.org/) (se recomienda la versión LTS)
- [Yarn](https://yarnpkg.com/) (este repositorio incluye un `yarn.lock`)

## Configuración

Copia [`.env.example`](.env.example) a `.env` y completa los valores.

| Variable | Obligatoria | Descripción |
| -------- | ----------- | ----------- |
| `CLOUDINARY_CLOUD_NAME` | Sí | Nombre de la nube en Cloudinary |
| `CLOUDINARY_API_KEY` | Sí | Clave API de Cloudinary |
| `CLOUDINARY_API_SECRET` | Sí | Secreto API de Cloudinary |
| `CLOUDINARY_FOLDER_ROOT` | No | Raíz de carpeta por defecto para subidas (también hay campo `folder` por solicitud) |
| `CLOUDINARY_MAX_UPLOAD_FILES` | No | Entero positivo que limita el tamaño del lote de subidas si se define |
| `DATABASE_URL` | No | Ruta del archivo SQLite o `:memory:`; por defecto `./data/app.sqlite` si no se define |
| `PORT` | No | Puerto HTTP; por defecto `3000` |
| `NODE_ENV` | No | Usa `development` para habilitar Swagger UI |

> **Nota:** `.env.example` menciona `SQLITE_DB_PATH`, pero la aplicación lee **`DATABASE_URL`** para la ruta de la base SQLite ([`src/core/options/typeorm.config.ts`](src/core/options/typeorm.config.ts)). Define `DATABASE_URL` en `.env` (o usa la ruta por defecto indicada).

## Instalación y ejecución

```bash
yarn install
```

```bash
# desarrollo (modo vigilancia)
yarn start:dev

# compilación para producción y arranque
yarn build
yarn start:prod
```

## Swagger (OpenAPI)

Cuando `NODE_ENV=development`, Swagger está disponible en:

`http://localhost:<PORT>/swagger`

(Reemplaza `PORT` por el valor configurado; por defecto `3000`.)

## Resumen de la API (`/image`)

| Método | Ruta | Resumen |
| ------ | ---- | ------- |
| `POST` | `/image` | Subir una imagen (`multipart/form-data`: `file`, opcional `folder`) |
| `POST` | `/image/many` | Subir varias imágenes (`files`, opcional `folder`) |
| `GET` | `/image` | Listar todas las imágenes |
| `GET` | `/image/:id` | Obtener una imagen por id |
| `PATCH` | `/image/:id` | Actualizar imagen (`file`, `public_id` en cuerpo multipart) |
| `DELETE` | `/image/bulk` | Eliminar varias imágenes por ids (cuerpo JSON) |
| `DELETE` | `/image/folder/:path` | Eliminar un segmento de ruta de carpeta en Cloudinary y filas relacionadas en BD |
| `DELETE` | `/image/:id` | Eliminar una imagen por id |

Consulta [`src/image/image.controller.ts`](src/image/image.controller.ts) y Swagger para los detalles de cada solicitud.

## Pruebas

```bash
# pruebas unitarias (*.spec.ts bajo src/)
yarn test

# modo vigilancia
yarn test:watch

# cobertura
yarn test:cov

# end-to-end
yarn test:e2e
```

Las pruebas unitarias **simulan** el SDK de Cloudinary (`jest.mock('cloudinary')`), por lo que **no** necesitas credenciales reales de Cloudinary para ejecutar Jest por defecto. Para usar la aplicación contra Cloudinary de verdad necesitas variables de entorno válidas.

## Estructura del proyecto

- [`src/cloudinary/`](src/cloudinary/) — Módulo Cloudinary, servicio que envuelve el SDK, utilidades y specs
- [`src/image/`](src/image/) — Entidad Image, servicio, controlador REST, DTOs y specs
- [`src/core/options/`](src/core/options/) — Configuración TypeORM con SQLite
- [`test/`](test/) — Configuración Jest e2e y specs

## Referencias

- [Integración Cloudinary para Node.js](https://cloudinary.com/documentation/node_integration)
- [Documentación de NestJS](https://docs.nestjs.com)
