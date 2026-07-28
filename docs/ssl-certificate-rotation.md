# SSL Certificate Rotation

This document describes the TLS certificate rotation process for Stellar-Save's
staging and production environments, and records the results of periodic
zero-downtime rotation drills.

---

## Overview

All HTTPS traffic to Stellar-Save services terminates at nginx. Certificates
are stored on disk and loaded by nginx at startup or graceful reload. A
graceful reload (`SIGHUP`) replaces the in-flight TLS contexts without dropping
active connections, enabling zero-downtime rotation.

---

## Certificate Locations

| Environment | Certificate path | Key path |
|-------------|-----------------|----------|
| Staging | `/etc/nginx/ssl/server.crt` | `/etc/nginx/ssl/server.key` |
| Production | `/etc/nginx/ssl/server.crt` | `/etc/nginx/ssl/server.key` |

Certificate source: Let's Encrypt (auto-renewed via certbot) or manually
provisioned CA-signed certificates.

---

## Rotation Procedure

### Automated (certbot / Let's Encrypt)

Certbot handles renewal automatically via its own timer or cron job. After
renewal it runs `nginx -s reload` via the deploy hook configured in
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`.

No manual steps are required for Let's Encrypt certificates unless the certbot
timer fails (check with `systemctl status certbot.timer`).

### Manual rotation

Use this procedure when replacing with a CA-issued certificate or rotating
for security reasons.

```bash
# 1. Copy new certificate and key into place
sudo cp /path/to/new_cert.pem  /etc/nginx/ssl/server.crt
sudo cp /path/to/new_key.pem   /etc/nginx/ssl/server.key

# 2. Validate nginx config before reloading
sudo nginx -t

# 3. Gracefully reload nginx (zero downtime — no connections dropped)
sudo kill -HUP $(cat /var/run/nginx.pid)
# or: sudo systemctl reload nginx

# 4. Verify the new certificate is being served
openssl s_client -connect <hostname>:443 -servername <hostname> \
  </dev/null 2>/dev/null | openssl x509 -noout -subject -enddate -fingerprint -sha256
```

### Using the automated drill script

The drill script performs the full procedure and asserts correctness:

```bash
# Live rotation against staging
./scripts/ssl_rotation_drill.sh \
  --target   staging.stellar-save.example.com \
  --port     443 \
  --cert     /path/to/new_cert.pem \
  --key      /path/to/new_key.pem \
  --duration 60 \
  --rps      10

# Dry run (no actual rotation, validates tooling)
./scripts/ssl_rotation_drill.sh --dry-run

# Custom rotation command (e.g. Kubernetes secret update)
DRILL_ROTATION_CMD="kubectl create secret tls tls-cert --cert=new.crt --key=new.key --dry-run=client -o yaml | kubectl apply -f -" \
  ./scripts/ssl_rotation_drill.sh --target my-cluster.example.com
```

The script exits `0` on success, `1` on any assertion failure. It writes a
JSON report to `ssl_drill_report.json` in the working directory.

---

## CI / Scheduled Drill

The GitHub Actions workflow `.github/workflows/ssl-rotation-drill.yml` runs
automatically on the **1st of every month at 03:00 UTC** and can be triggered
manually via `workflow_dispatch`.

It:
1. Spins up a local nginx instance with an "old" self-signed cert
2. Generates a "new" self-signed cert
3. Starts a concurrent load probe (`/health` endpoint)
4. Rotates the certificate via graceful nginx reload
5. Asserts zero failed requests, new cert served, old cert gone
6. Uploads a JSON report artifact (retained 90 days)
7. Updates this document's drill results table
8. Posts a summary comment to the `ssl-drill` tracking issue

To trigger manually:
1. Go to **Actions → SSL Certificate Rotation Drill**
2. Click **Run workflow**
3. Optionally override target, port, duration, and RPS

---

## Assertions

| # | Assertion | How verified |
|---|-----------|-------------|
| 1 | Zero failed requests during rotation | `curl` load probe counts non-2xx responses during the rotation window |
| 2 | New certificate is served post-rotation | `openssl s_client` SHA-256 fingerprint compared to expected new cert |
| 3 | Old certificate is no longer presented | Pre- and post-rotation fingerprints must differ |

A drill is considered **passed** only if all three assertions succeed.

---

## Rotation Cadence

| Event | Action |
|-------|--------|
| Let's Encrypt auto-renewal (every 60 days) | Automatic via certbot deploy hook |
| Drill (scheduled) | Monthly on the 1st via CI |
| Key compromise / suspected exposure | Immediate manual rotation + incident report |
| CA revocation | Immediate manual rotation |

---

## Drill Results

| Date | Status | Zero Downtime | Rotation Time | Cert Changed | New CN | Probe |
|------|--------|---------------|---------------|--------------|--------|-------|
<!-- drill-results-table-end -->

*Rows above are appended automatically by the CI drill workflow after each run.*

---

## Troubleshooting

**nginx fails to reload after cert swap**
- Run `sudo nginx -t` to catch config errors before reloading
- Check `/var/log/nginx/error.log` for TLS handshake errors
- Ensure the key and certificate are for the same keypair:
  `openssl x509 -noout -modulus -in server.crt | md5sum` must match
  `openssl rsa  -noout -modulus -in server.key | md5sum`

**Requests fail during rotation**
- nginx graceful reload (`SIGHUP`) does not drop connections — if requests are
  failing, the issue is likely in the new certificate itself (expired, wrong CN,
  untrusted CA)
- Check `ssl_session_cache` settings; large caches may serve the old cert to
  existing sessions for longer

**Drill script cannot connect**
- Confirm the staging server is reachable: `curl -sk https://<host>/health`
- Check firewall rules allow port 443 from the CI runner
- For self-signed certs in CI, `curl -sk` (insecure) is intentional; production
  drills should use a trusted CA cert and remove `-k`

---

## References

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt — Certbot documentation](https://certbot.eff.org/docs/)
- [nginx — Controlling nginx](https://nginx.org/en/docs/control.html)
- [Sigstore cosign — TLS cert attestation](https://docs.sigstore.dev/)
