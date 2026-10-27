# Self-hosting Domar

Domar ships as a Docker Compose stack of three containers:

| Service | What it runs | Data |
|---|---|---|
| `web` | Next.js app, the only public port (`8080`) | none |
| `api` | NestJS API, reachable only from `web` | photos in the `domar_uploads` volume |
| `postgres` | PostgreSQL 17 | database in the `domar_pgdata` volume |

The browser only ever talks to `web`. It forwards `/api/*` to the API
internally, which is why there's no CORS configuration to manage.

## Requirements

- A Linux server (any small VPS works) with Docker and the Compose plugin
- A domain name and HTTPS in front of Domar (see [HTTPS](#https))
- About 1 GB RAM to build the images, and disk space for photos

## Install

```sh
git clone <repository-url> domar && cd domar
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | Database password. Any long random string. |
| `JWT_SECRET` | yes | Signs login sessions. Generate with `node -e "console.log(crypto.randomBytes(48).toString('base64url'))"` or `openssl rand -base64 48`. Changing it signs everyone out. |
| `WEB_URL` | yes | Public address of your instance, e.g. `https://domar.example.com`. Used in invite links. |
| `COOKIE_SECURE` | no | Defaults to `true`. Set `false` **only** for testing over plain HTTP on a private network. |

Then build and start:

```sh
docker compose build
docker compose up -d
```

Database migrations run automatically every time the `api` container starts.

## HTTPS

Login cookies are marked *Secure*, so browsers will only send them over
HTTPS: signing in over plain `http://` silently fails. Put a reverse proxy
with TLS in front of port `8080`. With [Caddy](https://caddyserver.com),
which gets certificates automatically, the whole config is:

```
domar.example.com {
    reverse_proxy localhost:8080
}
```

Phones also require HTTPS to open the camera from the browser.

## Creating the first supervisor

Domar is invite-only, and only supervisors can invite. On a fresh install,
create the first supervisor from the command line:

```sh
docker compose exec \
  -e EMAIL='you@example.com' -e NAME='Your Name' -e PASSWORD='choose-a-strong-password' \
  api node -e '
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
(async () => {
  const prisma = new PrismaClient();
  await prisma.user.create({ data: {
    email: process.env.EMAIL, name: process.env.NAME, role: "SUPERVISOR",
    passwordHash: await argon2.hash(process.env.PASSWORD),
  } });
  await prisma.$disconnect();
  console.log("Supervisor created");
})();'
```

Sign in with that account, then invite everyone else from **Team**.

## Demo data

To try Domar out, you can load sample properties, jobs and users:

```sh
docker compose exec api node dist/prisma/seed.js
```

> **Never run this on an instance you use for real work.** The demo accounts
> (`*@domar.test`) share a password that is published in this repository.

## Backups

Back up both the database **and** the photos. Either one alone is incomplete.

```sh
# database
docker compose exec -T postgres pg_dump -U domar domar | gzip > domar-db-$(date +%F).sql.gz

# photos
docker run --rm -v domar_domar_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/domar-uploads-$(date +%F).tar.gz -C /data .
```

Volume names are prefixed with the Compose project name (the folder name by
default); check yours with `docker volume ls`.

To restore into a fresh stack:

```sh
gunzip -c domar-db-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U domar domar
docker run --rm -v domar_domar_uploads:/data -v "$PWD":/backup alpine \
  tar xzf /backup/domar-uploads-YYYY-MM-DD.tar.gz -C /data
```

## Upgrading

```sh
git pull
docker compose build
docker compose up -d
```

Take a backup first. New database migrations are applied automatically when
the `api` container restarts.

## Known limitations

- **Times are shown in Europe/Zagreb** for all users. This is not yet configurable.
- **No outgoing email.** Invite links are copied and sent by the supervisor.
- **Photos are stored on local disk** in the uploads volume. There's no object storage yet.
- **English only** for now. All text is prepared for translation.
