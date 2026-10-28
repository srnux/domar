# Self-hosting Domar

Domar ships as a Docker Compose stack of three containers:

| Service | What it runs | Data |
|---|---|---|
| `web` | Next.js app, the only public port (`8080`) | none |
| `api` | NestJS API, reachable only through `web` | photos and avatars in the `domar_uploads` volume |
| `postgres` | PostgreSQL 17 | database in the `domar_pgdata` volume |

Browsers and the worker app talk only to `web`, which forwards `/api/*` to
the API internally.

One installation can host several **companies** (tenants). Each company's
people, properties, jobs and bills are isolated from the others. You run the
installation as a **platform admin**: you create companies, set their seat
limits, and can suspend them.

## Requirements

- A Linux server (any small VPS works) with Docker and the Compose plugin
- A domain name and HTTPS in front of Domar (see [HTTPS](#https))
- About 1 GB RAM to build the images, and disk space for photos

## Install

```sh
git clone https://github.com/srnux/domar.git && cd domar
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | Database password. Any long random string. |
| `JWT_SECRET` | yes | Signs login sessions. Generate with `openssl rand -base64 48`. Changing it signs everyone out. |
| `WEB_URL` | yes | Public address of your instance, e.g. `https://domar.example.com`. Used in invite links. |
| `COOKIE_SECURE` | no | Defaults to `true`. Set `false` **only** for testing over plain HTTP on a private network. |
| `FIREBASE_SERVICE_ACCOUNT` | no | Enables push notifications to the worker app; see [The worker app](#the-worker-app). |
| `CORS_ORIGINS` | no | Extra origins allowed to call the API cross-origin, comma-separated. Neither the web app nor the worker app needs it. |

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

## Creating the platform admin

A fresh installation has no accounts. Create your platform admin from the
command line:

```sh
docker compose exec \
  -e EMAIL='you@example.com' -e NAME='Your Name' -e PASSWORD='choose-a-strong-password' \
  api node -e '
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
(async () => {
  const prisma = new PrismaClient();
  await prisma.user.create({ data: {
    email: process.env.EMAIL.trim().toLowerCase(), name: process.env.NAME,
    role: "OWNER", isPlatformAdmin: true,
    passwordHash: await argon2.hash(process.env.PASSWORD),
  } });
  await prisma.$disconnect();
  console.log("Platform admin created");
})();'
```

The `OWNER` role is deliberate: platform admin rights come from
`isPlatformAdmin`, and the owner role gives the account no access to any
company's day-to-day data.

Sign in at your Domar address and you'll land on the admin page (`/admin`).

## Adding a company

On the admin page, create a company with:

- **Name**, **plan** (a free-text label) and **monthly fee**. These are for
  your own records; Domar doesn't process payments.
- **Max seats**: how many active supervisors and workers the company may have.
  Pending invites count; property owners don't.
- **The first supervisor**: name, email and a password you choose. Domar
  doesn't send email, so pass the password on yourself and ask them to keep it
  safe.

That supervisor signs in, sets up properties, and invites the rest of the team
and the owners from **Team**. On the admin page you can later change a
company's seats, and **suspend** a company: its users are signed out within
15 minutes and can't sign in until you reactivate it. Their data is kept.

## Resetting a password

There's no self-service password reset yet. To set a new password for any
account:

```sh
docker compose exec \
  -e EMAIL='user@example.com' -e PASSWORD='their-new-password' \
  api node -e '
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
(async () => {
  const prisma = new PrismaClient();
  await prisma.user.update({
    where: { email: process.env.EMAIL.trim().toLowerCase() },
    data: { passwordHash: await argon2.hash(process.env.PASSWORD) },
  });
  await prisma.$disconnect();
  console.log("Password updated");
})();'
```

## The worker app

Workers can use the web app on their phones. The Android app adds offline mode
and push notifications; you build it for your own instance from
[`apps/worker-mobile`](../apps/worker-mobile):

1. In `apps/worker-mobile/.env`, set `VITE_API_BASE` to your public address,
   e.g. `https://domar.example.com`. The app then reaches the API through
   `web`, so no extra port or CORS setting is needed.
2. Build the app and the Android package as described in the
   [worker app README](../apps/worker-mobile/README.md), and distribute the APK
   to your workers.

**Push notifications** are optional. Without them the app works normally.
Currently a worker is notified when someone comments on one of their jobs. To
enable them, create a Firebase project, then:

- put its service-account JSON, on one line, in `FIREBASE_SERVICE_ACCOUNT` in
  `.env` and run `docker compose up -d`;
- build the app with `VITE_PUSH_ENABLED=true` and the project's
  `google-services.json` (see the worker app README).

## Demo data

To try Domar out, you can load sample companies, users, properties and jobs:

```sh
docker compose exec api node dist/prisma/seed.js
```

> **Never run this on an instance you use for real work.** It creates a
> platform admin and other accounts (`*@domar.test`, `*@adriatic.test`) whose
> password is published in this repository.

## Backups

Back up both the database **and** the uploads (photos and avatars). Either one
alone is incomplete.

```sh
# database
docker compose exec -T postgres pg_dump -U domar domar | gzip > domar-db-$(date +%F).sql.gz

# uploads
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

**Upgrading from a single-company version** (before companies existed): the
migration moves all existing data into a company called *Default Company*,
with the earliest supervisor as its account owner. It doesn't create a
platform admin, so [create one](#creating-the-platform-admin) if you want to
manage companies.

## Known limitations

- **Times are shown in Europe/Zagreb** for all users. This is not yet configurable.
- **No outgoing email.** Invite links are copied and sent by the supervisor.
- **No self-service password reset**; see [Resetting a password](#resetting-a-password).
- **Photos are stored on local disk** in the uploads volume. There's no object storage yet.
- **English only** for now. All app text is prepared for translation; bill PDFs
  are English.
- **The worker app is Android only.** There's no iOS project yet.
