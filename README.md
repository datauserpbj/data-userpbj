# Verifikasi Berkas - LPSE Portal

Full-stack web application for LPSE (Lembaga Pengelola Sistem Elektronik) verification form submissions.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Authentication**: Supabase Auth + Custom DB Auth (bcrypt)

## Project Structure

```
verifikasi-berkas/
├── server/
│   ├── index.js                     # Express server entry point
│   ├── lib/
│   │   └── supabase.js              # Supabase client initialization
│   └── routes/
│       ├── pengajuan.js             # CRUD + upload for submissions
│       ├── auth.js                  # Login against admin_verifikator
│       ├── ppk.js                   # PPK CRUD + sync
│       └── pp.js                    # PP CRUD + sync
├── src/
│   ├── main.jsx                     # React entry point
│   ├── App.jsx                      # Router + layout shell
│   ├── index.css                    # Tailwind + custom utilities
│   ├── hooks/
│   │   └── useAuth.js               # Auth state (Supabase auth + DB fallback)
│   ├── lib/
│   │   ├── supabase.js              # Frontend Supabase client
│   │   └── api.js                   # API fetch helper
│   ├── components/
│   │   ├── TopNavBar.jsx
│   │   ├── SideNavBar.jsx
│   │   ├── InfoCard.jsx
│   │   └── FileUploadCard.jsx
│   └── pages/
│       ├── PengajuanForm.jsx
│       ├── EditPengajuan.jsx
│       ├── CekStatus.jsx / KolomCekStatus.jsx
│       ├── LoginVerifikator.jsx
│       ├── DashboardVerifikator.jsx
│       ├── PengajuanMasuk.jsx / DetailPengajuan.jsx
│       ├── LaporanVerifikator.jsx
│       ├── DataPPK.jsx / DataPP.jsx
│       └── ProfilVerifikator.jsx
├── supabase/
│   ├── config.toml                   # Supabase CLI configuration
│   └── migrations/
│       ├── *.sql                     # Versioned database migrations
│       └── setup.sql                 # Combined setup for manual execution
├── uploads/                         # Legacy local uploads (deprecated)
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Environment template
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── railway.json                     # Railway deploy config
├── vercel.json                      # Vercel rewrites
└── README.md
```

## Database Schema

### Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `formulir_pengajuan` | `id (uuid PK)`, `nama_lengkap`, `nip`, `jabatan`, `satker`, `status` (draft/submitted/verified/rejected), `alasan_ditolak`, `alasan_revisi`, `revisi_selesai`, timestamps | Main application submissions |
| `dokumen` | `id (uuid PK)`, `formulir_id (FK)`, `jenis_dokumen`, `filename`, `filepath`, `bucket`, `path`, `size_bytes`, `uploaded_at` | Uploaded PDF documents per submission |
| `admin_verifikator` | `id (uuid PK)`, `email (unique)`, `password_hash`, `nama_lengkap`, `role`, timestamps | Verifier admin accounts |
| `admin_pemohon` | `id (uuid PK)`, `email (unique)`, `password_hash`, `nama_lengkap`, `satker`, `role`, timestamps | Applicant admin accounts |
| `satker` | `id (uuid PK)`, `nama_satker (unique)`, `created_at` | Work units (Satuankerja) |
| `ppk` | `id (uuid PK)`, `nama_lengkap`, `nip (unique)`, `jabatan`, `satker`, `status_aktif` (aktif/non-aktif), `alasan_penonaktifan`, timestamps | Pejabat Pembuat Komitmen registry |
| `pp` | `id (uuid PK)`, `nama_lengkap`, `nip (unique)`, `jabatan`, `satker`, `status_aktif` (aktif/non-aktif), `alasan_penonaktifan`, timestamps | Pejabat Pengadaan registry |

### Triggers

- `trigger_sync_ppk_from_pengajuan` / `trigger_delete_ppk_from_pengajuan` on `formulir_pengajuan` - auto-sync PPK records
- `trigger_sync_pp_from_pengajuan` / `trigger_delete_pp_from_pengajuan` on `formulir_pengajuan` - auto-sync PP records

## Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Supabase CLI** (optional, for local dev): `npm install -g supabase`
3. **Node.js** >= 18

## Setup & Running

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Get your credentials from:
- Supabase Dashboard → Project Settings → API

Required variables:
- `VITE_SUPABASE_URL` - Project URL
- `VITE_SUPABASE_ANON_KEY` - Anon/Public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role key (backend only)

### 2. Apply Database Migrations

#### Option A: Supabase Dashboard (Easiest)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/migrations/setup.sql`
4. Paste into the SQL Editor and click **Run**

#### Option B: Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ahxnszpgszbohssthveb

# Push migrations
supabase db push
```

### 3. Create Storage Buckets

Create the following buckets in **Supabase Dashboard → Storage**:

| Bucket Name | Purpose |
|-------------|---------|
| `Surat Permohonan` | Surat Permohonan Verifikasi |
| `Pakta Integritas` | Pakta Integritas |
| `SK Terbaru` | SK PP/PPK/PA Terbaru |
| `Surat Rekomendasi UKPBJ` | Surat Rekomendasi UKPBJ |
| `Sertifikat Level 1` | Sertifikat PBJ Level-1 |
| `SK KPA atau Sertifikat PBJ Level-1` | SK KPA / Sertifikat PBJ Level-1 |

Set each bucket to **Public** or configure appropriate RLS policies.

### 4. Install Dependencies & Run

```bash
# Install dependencies
npm install

# Start both frontend and backend (development)
npm run dev

# Start only the backend server
npm run server

# Build for production
npm run build
```

## API Endpoints

- `POST /api/pengajuan` - Submit a new verification application with form data and PDF files
- `GET /api/pengajuan` - List all submissions
- `GET /api/pengajuan/:id` - Get submission details by ID
- `PUT /api/pengajuan/:id` - Update submission
- `PUT /api/pengajuan/:id/status` - Update submission status
- `GET /api/satker` - List work units
- `POST /api/auth/login` - Login (verifikator)
- `GET /api/ppk` - List PPK data
- `POST /api/ppk` - Create PPK data
- `PUT /api/ppk/:id` - Update PPK data
- `POST /api/ppk/:id/mutasi` - Mutate PPK
- `POST /api/ppk/sync` - Sync PPK from pengajuan
- `GET /api/pp` - List PP data
- `POST /api/pp` - Create PP data
- `PUT /api/pp/:id` - Update PP data
- `POST /api/pp/:id/mutasi` - Mutate PP
- `POST /api/pp/sync` - Sync PP from pengajuan
- `GET /api/health` - Health check

## File Uploads

- Accepted format: PDF only
- Maximum file size: varies by document type (2MB - 10MB)
- Uploaded files are stored in Supabase Storage buckets

## Deployment

- **Frontend**: Deploy to Vercel (`vercel.json` included)
- **Backend**: Deploy to Railway (`railway.json` included)

Make sure to set environment variables in your deployment platform.
