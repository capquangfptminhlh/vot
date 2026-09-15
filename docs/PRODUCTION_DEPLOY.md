# ChoVot production deployment runbook

This runbook is for the self-hosted ChoVot stack. Production does **not** depend on Supabase or GitHub Pages.

## Production topology

- `web`: Caddy edge + static ChoVot frontend, only service publishing host ports 80/443.
- `api`: NestJS API, private Docker network only.
- `migrate`: one-shot Prisma migration + catalog seed/check before API starts.
- `postgres`: PostgreSQL, private Docker network only.
- `redis`: Redis with password, private Docker network only.
- `minio`: private S3-compatible object storage, private Docker network only.
- `minio-init`: creates buckets/service user and public-read policy only for sanitized listing images.

Public routes:

- `https://<CHOVOT_DOMAIN>/` -> frontend
- `https://<CHOVOT_DOMAIN>/api/v1/...` -> Nest API
- `https://<CHOVOT_DOMAIN>/media/...` -> public sanitized listing images only
- `https://<CHOVOT_STORAGE_DOMAIN>/...` -> S3 endpoint used by short-lived signed browser uploads

Never publish PostgreSQL, Redis, the Nest port, or the MinIO console directly to the Internet.

## 1. DNS before first start

Create DNS records pointing to the production VPS:

- `CHOVOT_DOMAIN` (for example `chovot.vn`)
- `CHOVOT_STORAGE_DOMAIN` (for example `storage.chovot.vn`)

Caddy obtains and renews TLS automatically. Ports 80 and 443 must reach the VPS during certificate issuance and normal operation.

## 2. Host firewall

Allow only what the server actually needs:

- SSH administration port from trusted sources where practical
- TCP 80
- TCP 443
- UDP 443 (HTTP/3; optional but used by the production compose)

Do **not** open 3000, 5432, 6379, 9000, or 9001 to the public Internet.

## 3. Create `.env.production`

The file is intentionally gitignored. Keep it owned by the deployment account and set mode 600.

```bash
install -m 600 /dev/null .env.production
```

Required deployment variables:

```text
CHOVOT_DOMAIN
CHOVOT_STORAGE_DOMAIN
ACME_EMAIL
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL
REDIS_PASSWORD
JWT_ACCESS_SECRET
OTP_PEPPER
REFRESH_TOKEN_PEPPER
IP_HASH_PEPPER
SERIAL_HASH_PEPPER
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
S3_ACCESS_KEY
S3_SECRET_KEY
S3_PRIVATE_BUCKET
S3_PUBLIC_BUCKET
```

Use independent random values for every secret. A simple safe generator for hex secrets is:

```bash
openssl rand -hex 32
```

Use a URL-safe PostgreSQL password and make `DATABASE_URL` point to the Docker service name `postgres`, not localhost.

Example structure only (do not copy literal values):

```text
POSTGRES_DB=chovot
POSTGRES_USER=chovot
DATABASE_URL=postgresql://<user>:<password>@postgres:5432/chovot?schema=public
S3_PRIVATE_BUCKET=chovot-private
S3_PUBLIC_BUCKET=chovot-public
```

`OTP_DEV_CODE` must not exist in production. The API refuses to start if it is set while `NODE_ENV=production`.

## 4. External OTP and KYC providers

Real seller publishing depends on real verification. Configure these before public launch:

```text
OTP_DELIVERY_WEBHOOK_URL
OTP_DELIVERY_WEBHOOK_SECRET
KYC_PROVIDER_BASE_URL
KYC_PROVIDER_API_KEY
KYC_PROVIDER_NAME
KYC_WEBHOOK_SECRET
KYC_WEBHOOK_PUBLIC_URL
```

Rules:

- provider URLs must be HTTPS;
- secrets must be independent random values;
- ChoVot must not put raw CCCD/selfie data into browser storage;
- seller `SUSPENDED` state is administrative and cannot be cleared by a successful provider callback;
- seller verification and paddle authenticity remain separate concepts.

If OTP/KYC is not configured, keep the site in pre-launch mode. Do not present verification as operational.

## 5. Validate before touching production

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

The repository CI also validates the production compose, builds the API runtime/migration images, builds the frontend edge image, and validates the Caddyfile.

## 6. Back up before every production upgrade

For an existing installation:

```bash
bash deploy/backup.sh
```

Backups contain:

- PostgreSQL custom-format dump
- private MinIO bucket
- public MinIO bucket
- checksum manifest
- source commit metadata

Copy backups off the VPS as well. A backup stored only on the same disk as production is not disaster recovery.

## 7. Build and start

```bash
git fetch origin
git checkout main
git pull --ff-only

docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

The API does not start until:

1. PostgreSQL is healthy;
2. migration/seed/catalog checks finish successfully;
3. Redis is healthy;
4. MinIO buckets and access policies have been initialized.

## 8. Post-deploy verification

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS "https://${CHOVOT_DOMAIN}/api/v1/health"
curl -fsS "https://${CHOVOT_DOMAIN}/api/v1/ready"
curl -fsSI "https://${CHOVOT_DOMAIN}/"
```

Then perform an actual browser E2E pass:

1. request real OTP;
2. verify/login;
3. open account page;
4. create listing draft;
5. upload image through the signed storage URL;
6. finish phone + identity + bank verification with the real provider;
7. submit listing for moderation;
8. approve through a moderator account;
9. verify public listing, seller trust state, favorite/report and direct chat from a second user;
10. mark listing sold and confirm it is no longer offered as active inventory.

Do not call the release production-ready until this flow passes against the real production services.

## 9. Restore

Restores are destructive and deliberately require an explicit acknowledgement:

```bash
RESTORE_CONFIRM=YES bash deploy/restore.sh backups/<timestamp>
```

The restore script:

- verifies checksums;
- stops API/web;
- restores PostgreSQL;
- mirrors both MinIO buckets back to the snapshot;
- reapplies forward migrations;
- starts API/web again.

## 10. Rollback

Application-only rollback:

1. identify the last known-good git commit;
2. run a fresh backup;
3. checkout that commit;
4. rebuild and `up -d` the production compose;
5. run health/E2E checks.

Database migrations are treated as forward-only. If a bad release contains a destructive or incompatible database migration, restore the matching pre-release backup rather than trying to improvise a reverse migration on live data.

## 11. Minimum recurring operations

- daily automated off-host backup;
- periodic restore drill to a non-production environment;
- OS and Docker security updates;
- disk/database/object-storage capacity alerts;
- `/ready` availability monitoring;
- certificate-expiry monitoring even though Caddy renews automatically;
- centralized application logs with retention;
- review failed OTP/KYC/moderation/report rates;
- rotate provider/API secrets after suspected exposure;
- never commit `.env.production`, dumps, provider secrets or private KYC material.

## Launch blockers outside code

Code and containers are not the only production requirements. Before opening ChoVot publicly, confirm:

- the actual production domain/DNS;
- real OTP delivery provider;
- real eKYC/bank-name provider and signed webhook contract;
- operator/legal entity, complaint/support channel and applicable Vietnam e-commerce/privacy obligations;
- production monitoring/backup destination;
- moderator/admin accounts and operational process;
- enough real, sourced paddle catalog data and real listings to replace preview content.
