# REVE — Production Deployment Environment Variables Specification
**Target Infrastructure: Vercel (Frontend) · Render (Backend) · Supabase (PostgreSQL) · Cloudflare R2 (Object Storage) · Kaggle (GPU Inference Worker)**  
**Budget Tier: ₹0 Zero-Cost Free Tier Architecture**

---

## 1. Overview & Security Policy

This document defines all environment variables, connection configurations, and operational parameters required to deploy and run Reve across the target deployment platforms.

### Mandatory Security Rules
1. **Zero Secret Leakage:** Never commit `.env` files or hardcode secrets, tokens, database passwords, or private keys into source code or Git history.
2. **Production Entropy:** In production (`ENVIRONMENT=production`), the backend enforces that `JWT_SECRET_KEY` is at least 32 characters and `REVE_WORKER_SECRET_TOKEN` is at least 16 characters, rejecting any development defaults (`dev-*`).
3. **Worker Token Alignment:** Render's `REVE_WORKER_SECRET_TOKEN` and Kaggle's `REVE_WORKER_TOKEN` (or `REVE_WORKER_SECRET_TOKEN`) **must match exactly** to authenticate the outbound-polling GPU worker.
4. **Private Storage by Default:** Cloudflare R2 bucket remains private. Images are accessed via short-lived (15-minute) presigned GET redirects through the backend endpoint `/api/v1/images/file/{filename}`.

---

## 2. Vercel (Frontend React / Vite Application)

Configure these variables in **Vercel Dashboard → Project Settings → Environment Variables**.

| Variable Name | Required | Secret? | Recommended Format | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | No | `https://<render-service-name>.onrender.com/api/v1` | **Critical:** Must include the full HTTPS origin and the `/api/v1` suffix (no trailing slash). Used by Axios and `resolveImageUrl()` for all API calls and image asset resolution. |

### Vercel Routing Configuration (`frontend/vercel.json`)
The application defines ordered rewrites in `frontend/vercel.json`:
1. `/api/:path*` → Proxies all API and image file requests (`/api/v1/images/file/*`) to the Render backend service.
2. `/(.*)` → SPA fallback routing all client navigations (`/`, `/studio`, `/signin`, `/signup`) to `/index.html`.

Because rewrites evaluate sequentially, API calls and raster images take precedence and are never swallowed by the SPA HTML fallback.

---

## 3. Render (Backend Web Service)

Configure these variables in **Render Dashboard → Web Service → Environment Variables**.

### Build & Start Commands
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:**
  ```bash
  alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
  ```
  *(The `--workers 1` flag is required because `RemoteWorkerProvider` uses in-process `asyncio.Event` synchronization for job dispatch and result handoffs.)*

### Core Application Configuration
| Variable Name | Required | Secret? | Recommended Production Value | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `ENVIRONMENT` | **Yes** | No | `production` | Switches backend to production mode. Enforces strict secret validation, disables auto-docs in high-security paths, and enforces remote worker inference. |
| `DEBUG` | **Yes** | No | `false` | Disables debug logging and stack trace leakage in API error responses. |
| `LOG_LEVEL` | No | No | `INFO` | Logging verbosity (`INFO`, `WARNING`, `ERROR`). |
| `IMAGE_PROVIDER` | **Yes** | No | `remote_worker` | **Critical:** Must be `remote_worker`. Prevents Render's 512MB RAM free container from attempting local Diffusers CPU inference (which causes immediate OOM crash). |
| `ALLOW_CPU_INFERENCE` | No | No | `false` | Explicitly disables local CPU fallback in production. |
| `CORS_ORIGINS` | **Yes** | No | `["https://<your-vercel-domain>.vercel.app"]` | JSON array of permitted frontend origins for authenticated cross-origin requests. |

### Security & Authentication
| Variable Name | Required | Secret? | Format / Guidance | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `JWT_SECRET_KEY` | **Yes** | **YES** | Random 64-char hex (`openssl rand -hex 32`) | Secret key used to sign and verify HS256 access and refresh tokens. |
| `JWT_ALGORITHM` | No | No | `HS256` | Cryptographic algorithm for JWT encoding. |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | No | `15` | Expiration time for short-lived access tokens. |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | No | No | `7` | Expiration time for long-lived session refresh tokens. |
| `REVE_WORKER_SECRET_TOKEN` | **Yes** | **YES** | Random 32-char hex (`openssl rand -hex 16`) | Secret token used to authenticate inbound requests from the Kaggle GPU worker. Must match Kaggle's worker token secret. |

### Database Persistence (Supabase PostgreSQL)
| Variable Name | Required | Secret? | Format / Guidance | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | **YES** | `postgresql+asyncpg://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?ssl=require` | **Recommended:** Supabase **Session Pooler on port 5432**. |

#### Important Architectural Note on Supabase Pooler Modes:
- **Session Pooler (Port 5432, Recommended):**
  - Maintains a 1:1 session mapping between the backend connection pool and PostgreSQL backend processes.
  - Fully compatible with `asyncpg` default server-side prepared statements (`PREPARE __asyncpg_stmt_X__`).
  - Supports transactional DDL and lock operations required by Alembic (`alembic upgrade head`).
  - Resolves to IPv4 (essential for Render free-tier outbound routing).
- **Transaction Pooler (Port 6543, Not Recommended for current config):**
  - Multiplexes consecutive transactions across different physical PostgreSQL backend connections.
  - By default, `asyncpg` caches prepared statements per client connection. When executed on a different physical connection, PostgreSQL raises:
    `asyncpg.exceptions.FeatureNotSupportedError: prepared statement "__asyncpg_stmt_1__" does not exist`.
  - To use the Transaction Pooler, `connect_args={"statement_cache_size": 0}` must be configured in SQLAlchemy engine creation.
- **URL Normalization:** The backend automatically converts `postgres://` or `postgresql://` to `postgresql+asyncpg://` and rewrites `sslmode=require` to `ssl=require`.

### Object Storage (Cloudflare R2)
| Variable Name | Required | Secret? | Format / Guidance | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `S3_ENDPOINT_URL` | **Yes** | No | `https://<account_id>.r2.cloudflarestorage.com` | Cloudflare R2 S3-compatible API endpoint URL. |
| `S3_BUCKET` | **Yes** | No | `reve-assets` | Name of the Cloudflare R2 bucket. |
| `AWS_ACCESS_KEY_ID` | **Yes** | **YES** | R2 Access Key ID | Cloudflare R2 API token Access Key ID. |
| `AWS_SECRET_ACCESS_KEY` | **Yes** | **YES** | R2 Secret Access Key | Cloudflare R2 API token Secret Access Key. |
| `AWS_REGION` | **Yes** | No | `auto` | Set to `auto` (or `us-east-1` for standard S3 SDK compatibility). |
| `S3_USE_SSL` | **Yes** | No | `true` | Enforces HTTPS communication for R2 uploads and downloads. |
| `S3_PUBLIC_URL` | **Optional** | No | Omit for private bucket mode | If omitted (recommended), the bucket remains private and the backend generates secure, 15-minute presigned GET redirects. |

### Abuse Protection & Rate Limiting (In-Memory, ₹0 Cost)
| Variable Name | Required | Secret? | Default Value | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `ENABLE_RATE_LIMITING` | No | No | `true` | Enables in-memory sliding-window request throttling and concurrency limits. |
| `MAX_CONCURRENT_JOBS_PER_USER` | No | No | `1` | Restricts each user to 1 active generation job at a time, preventing queue exhaustion. |
| `MAX_GENERATIONS_PER_USER_WINDOW` | No | No | `10` | Max generations allowed per user within the rate-limit window. |
| `GENERATION_WINDOW_SECONDS` | No | No | `300` | Sliding window duration in seconds (5 minutes). |
| `MAX_REGISTRATIONS_PER_IP_HOUR` | No | No | `5` | Max account creations allowed per IP per hour, mitigating bot registration floods. |
| `MAX_UPLOADS_PER_USER_HOUR` | No | No | `20` | Max image reference uploads allowed per user per hour. |
| `INVITE_ONLY_REGISTRATION` | No | No | `false` | Set to `true` to require an invite code for new registrations. |
| `INVITE_CODE` | Optional | **YES** | Custom passphrase | Secret registration code required when `INVITE_ONLY_REGISTRATION=true`. |

---

## 4. Kaggle (Inference Compute Plane)

Configure these as **Kaggle Notebook Secrets** (Add-ons → Secrets) or environment variables in your notebook runner.

| Variable Name | Required | Secret? | Format / Guidance | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `REVE_BACKEND_URL` | **Yes** | No | `https://<render-service-name>.onrender.com` | Root HTTPS URL of the deployed Render backend (without trailing slash or `/api/v1`). Worker automatically normalizes trailing suffixes. |
| `REVE_WORKER_TOKEN` *(or `REVE_WORKER_SECRET_TOKEN`)* | **Yes** | **YES** | Matching random token | Secret authentication token. **Must match character-for-character with Render's `REVE_WORKER_SECRET_TOKEN`.** |

### Kaggle Worker Startup Instructions
1. Open [Kaggle](https://kaggle.com) and create a new Python Notebook.
2. In the right-hand panel, set **Accelerator** to **GPU T4 x2** (or GPU T4) and set **Internet** to **On** (requires phone verification).
3. In Kaggle **Add-ons → Secrets**, add:
   - Label: `REVE_BACKEND_URL`, Value: `https://<render-service-name>.onrender.com`
   - Label: `REVE_WORKER_TOKEN`, Value: `<matching-token>`
4. In the first notebook cell, clone or paste the worker script from `ai-engine/worker/kaggle_worker.py`:
   ```bash
   pip install -q diffusers transformers accelerate torch requests pillow
   python ai-engine/worker/kaggle_worker.py
   ```
5. The worker will verify GPU acceleration, connect to Render via outbound HTTPS, emit heartbeats every 15 seconds, and poll for pending jobs.

---

## 5. Summary Checklist Before Deployment

- [ ] **Vercel:** Set `VITE_API_BASE_URL=https://<render-service-name>.onrender.com/api/v1` (with `/api/v1` suffix).
- [ ] **Vercel:** Confirm `frontend/vercel.json` contains `/api/:path*` proxy rewrite.
- [ ] **Render:** Set `ENVIRONMENT=production`, `DEBUG=false`, `IMAGE_PROVIDER=remote_worker`, `ALLOW_CPU_INFERENCE=false`.
- [ ] **Render:** Generate high-entropy `JWT_SECRET_KEY` and `REVE_WORKER_SECRET_TOKEN` (`openssl rand -hex 32`).
- [ ] **Render:** Add Supabase Session Pooler connection (`aws-0-[region].pooler.supabase.com:5432`) with `?ssl=require`.
- [ ] **Render:** Add Cloudflare R2 bucket name, endpoint, and access/secret keys.
- [ ] **Render:** Set `CORS_ORIGINS` to include the deployed Vercel domain.
- [ ] **Kaggle:** Add `REVE_BACKEND_URL` and `REVE_WORKER_TOKEN` (identical to Render's token).
- [ ] **Kaggle:** Ensure "Internet on" is enabled in Notebook Options.
