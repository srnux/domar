# Security policy

Domar stores data that matters to the people using it: property access codes,
photos of people's homes, and billing information, kept separate per company.
Thank you for helping keep it safe.

## Reporting a vulnerability

**Please don't report security problems in public issues, discussions or pull
requests.**

Report them privately through GitHub:
[**Report a vulnerability**](https://github.com/srnux/domar/security/advisories/new)
(the *Security* tab → *Report a vulnerability*).

Please include:

- what an attacker could do, and which role or account they'd need;
- steps to reproduce, or a proof of concept;
- the commit or version you tested.

You can expect an acknowledgement within a week. This is a small project
maintained in spare time, so a fix may take longer; you'll be kept informed,
and credited in the advisory if you'd like.

## Scope

Particularly interesting:

- one company seeing or changing another company's data (tenant isolation);
- a role doing more than it should, e.g. an owner reading internal comments or
  a worker reading jobs not assigned to them;
- authentication and session handling, invite links;
- access to photos or bills without permission.

Out of scope:

- the demo accounts and password in `apps/api/prisma/seed.ts` (demo data,
  documented as never to be used in production);
- instances run without HTTPS or with `COOKIE_SECURE=false`;
- missing rate limiting or denial of service through sheer volume.

## Supported versions

Only the latest `main` gets security fixes.
