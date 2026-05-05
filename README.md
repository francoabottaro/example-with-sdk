# Cloudinary sample API (NestJS)

Español: [README.sp.md](README.sp.md)

Sample REST API built with [NestJS](https://nestjs.com/) and the official [Cloudinary Node SDK](https://cloudinary.com/documentation/node_integration). It persists image metadata in SQLite via TypeORM and includes unit and end-to-end tests.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Yarn](https://yarnpkg.com/) (this repo includes a `yarn.lock`)

## Configuration

Copy [`.env.example`](.env.example) to `.env` and fill in your values.

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLOUDINARY_FOLDER_ROOT` | No | Default upload folder root (also see per-request `folder` field) |
| `CLOUDINARY_MAX_UPLOAD_FILES` | No | Positive integer cap on batch upload size when set |
| `DATABASE_URL` | No | SQLite file path or `:memory:`; defaults to `./data/app.sqlite` if unset |
| `PORT` | No | HTTP port; defaults to `3000` |
| `NODE_ENV` | No | Use `development` to enable Swagger UI |

> **Note:** `.env.example` mentions `SQLITE_DB_PATH`, but the app reads **`DATABASE_URL`** for the SQLite database path ([`src/core/options/typeorm.config.ts`](src/core/options/typeorm.config.ts)). Set `DATABASE_URL` in `.env` (or rely on the default path above).

## Install and run

```bash
yarn install
```

```bash
# development (watch mode)
yarn start:dev

# production build + run
yarn build
yarn start:prod
```

## Swagger (OpenAPI)

When `NODE_ENV=development`, Swagger is served at:

`http://localhost:<PORT>/swagger`

(Substitute your `PORT`, default `3000`.)

## API overview (`/image`)

| Method | Path | Summary |
| ------ | ---- | ------- |
| `POST` | `/image` | Upload a single image (`multipart/form-data`: `file`, optional `folder`) |
| `POST` | `/image/many` | Upload multiple images (`files`, optional `folder`) |
| `GET` | `/image` | List all images |
| `GET` | `/image/:id` | Get one image by id |
| `PATCH` | `/image/:id` | Update image (`file`, `public_id` in multipart body) |
| `DELETE` | `/image/bulk` | Delete multiple images by ids (JSON body) |
| `DELETE` | `/image/folder/:path` | Delete a Cloudinary folder path segment and related DB rows |
| `DELETE` | `/image/:id` | Delete one image by id |

See [`src/image/image.controller.ts`](src/image/image.controller.ts) and Swagger for request shapes.

## Tests

```bash
# unit tests (*.spec.ts under src/)
yarn test

# watch mode
yarn test:watch

# coverage
yarn test:cov

# e2e
yarn test:e2e
```

Unit tests mock the Cloudinary SDK (`jest.mock('cloudinary')`), so you do **not** need real Cloudinary credentials for the default Jest runs. Integration behavior against Cloudinary still requires valid env vars when running the live app.

## Project layout

- [`src/cloudinary/`](src/cloudinary/) — Cloudinary module, service wrapping the SDK, helpers, specs
- [`src/image/`](src/image/) — Image entity, service, REST controller, DTOs, specs
- [`src/core/options/`](src/core/options/) — TypeORM SQLite configuration
- [`test/`](test/) — End-to-end Jest setup and specs

## References

- [Cloudinary Node.js integration](https://cloudinary.com/documentation/node_integration)
- [NestJS documentation](https://docs.nestjs.com)
