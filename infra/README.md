# Deploying the demo backend

One VPS (Ubuntu, 4 GB RAM minimum) runs `infra/compose.prod.yaml`: Medusa server (admin included) and worker, Postgres, Redis,
Meilisearch, Mailpit and Caddy (automatic HTTPS). The storefront is hosted on Vercel / Cloudflare Pages and calls `https://api.<domain>`.
Product photos live on the `static` Docker volume. Local development uses `infra/docker-compose.yml` (`make up`) instead.

## Fresh VPS
1. DNS: an `A` record `api.<domain>` -> the VPS IP. Open ports 80 and 443.
2. Install Docker (`curl -fsSL https://get.docker.com | sh`), then `git clone <repo> /opt/vck && cd /opt/vck`.
3. `cp .env.prod.example .env.prod` and fill every value (secrets: `openssl rand -hex 32`; `PUBLISHABLE_KEY=pk_` + `openssl rand -hex 32`).
   Keep the file in the password manager. Set `STORE_ORIGIN` to the storefront URL and `VNPAY_RETURN_URL` to its `/checkout/vnpay-return`.
4. `docker compose -f infra/compose.prod.yaml --env-file .env.prod up -d --build postgres redis meilisearch`
5. First data: `docker compose -f infra/compose.prod.yaml --env-file .env.prod --profile tools run --rm init` (migrations, region, admin user, seed, search index).
6. `docker compose -f infra/compose.prod.yaml --env-file .env.prod up -d --build`
7. Check: `curl https://api.<domain>/health/ready` -> `{"status":"ok"}`; admin at `https://api.<domain>/app`.
8. Storefront env: `MEDUSA_BACKEND_URL=https://api.<domain>`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>`, `NEXT_PUBLIC_API_MODE=real`.
9. Mail: the demo sends confirmation mails to Mailpit (UI on 127.0.0.1:8025 of the VPS, use `ssh -L 8025:localhost:8025`).

## Nightly reset and backups (cron, VPS time zone Asia/Ho_Chi_Minh)
```
0 3  * * * /opt/vck/infra/scripts/demo-reset.sh >> /var/log/vck-reset.log 2>&1   # make demo-reset
30 2 * * * /opt/vck/infra/scripts/backup.sh     >> /var/log/vck-backup.log 2>&1  # make backup
```
`demo-reset` drops the database (orders, carts, customers), uploads and search index, then reseeds; the pinned `PUBLISHABLE_KEY` keeps the
storefront working. `backup` writes a gzipped `pg_dump` to the private bucket (`BACKUP_S3_*`) and keeps the newest 14.
Restore check: `make restore-check` loads the newest backup into a throwaway database and verifies the catalogue. Run it after setting up
the bucket and then monthly. Photos are not backed up: the seed recreates them.

## VNPay sandbox from a laptop (cloudflared tunnel)
The sandbox must reach `/hooks/vnpay/ipn` over public HTTPS. With the backend on `localhost:9000`:
```
brew install cloudflared            # or see developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads
cloudflared tunnel --url http://localhost:9000     # prints https://<random>.trycloudflare.com
```
Register `https://<random>.trycloudflare.com/hooks/vnpay/ipn` as the IPN URL in the VNPay merchant portal [verify: the sandbox takes the IPN
URL from the portal, not from the payment request], and put the sandbox `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` and
`VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` in `apps/backend/.env`. The tunnel URL changes on every start.
On the VPS no tunnel is needed: the IPN URL is `https://api.<domain>/hooks/vnpay/ipn`.

## Deviations from the plan
No MinIO in production: photos use Medusa's local file provider on a volume. Add MinIO or S3 when the catalogue grows beyond one disk.
