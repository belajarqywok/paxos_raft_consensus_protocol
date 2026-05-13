# 🛰️ Master Guide: Distributed Consensus & Library Management System

Dokumentasi ini adalah panduan teknis lengkap untuk memahami, menjalankan, dan melakukan eksperimen pada proyek ini.

---

## 🏗️ 1. Arsitektur Modular (Dynamic Loading)

Aplikasi ini menggunakan NestJS dengan sistem **Dynamic Module Loading**. Artinya, satu codebase yang sama bisa berjalan dalam berbagai "peran" tergantung variabel lingkungan (`APP_MODE`).

### Mode Aplikasi:
| Mode (`APP_MODE`) | Port | Deskripsi |
|---|---|---|
| `raft` | 3001-3003 | Menjalankan node simulasi protokol Raft. |
| `paxos` | 4001-4003 | Menjalankan node simulasi protokol Paxos. |
| `lib` | 5000 | Menjalankan aplikasi Library (CRUD + Auth + RBAC). |
| `dash` | 3004 | Dashboard visual untuk memantau kesehatan seluruh cluster. |
| `all` | - | Menjalankan semua modul di satu instance (hanya untuk dev). |

---

## 🏃 2. Protokol Konsensus: Raft

Raft dirancang untuk menjadi algoritma konsensus yang mudah dipahami. Fokusnya adalah menjaga **Strong Leader** dan replikasi log yang berurutan.

### Peran Node (State Machine):
1.  **Follower**: Pasif, hanya menerima pesan. Jika tidak ada kabar dari Leader, dia akan berubah jadi Candidate.
2.  **Candidate**: Sedang mencalonkan diri dalam pemilihan (Election).
3.  **Leader**: Pemegang kendali. Tugasnya mengirim heartbeat agar follower tidak memulai pemilihan baru.

### Mekanisme Utama di Kode (`src/raft/`):
*   **Election Timeout**: Timer acak (3-6 detik) yang memicu pemilihan jika Leader hilang.
*   **Request Vote**: Proses memperebutkan mayoritas suara ($N/2 + 1$).
*   **Append Entries (Heartbeat)**: Sinyal rutin dari Leader ke semua Follower. Jika gagal diterima, Follower akan menganggap Leader mati.

### Cara Eksperimen Raft:
```bash
# 1. Jalankan cluster Raft (3 node)
make pm2-start-raft

# 2. Cek siapa yang jadi Leader di Dashboard (port 3004)
# 3. Matikan Leader tersebut:
npx pm2 stop raft-1 (atau id yang jadi leader)

# 4. Perhatikan log/dashboard: Node lain akan otomatis melakukan voting dan memilih Leader baru.
```

---

## ⚖️ 3. Protokol Konsensus: Paxos

Paxos adalah algoritma konsensus klasik yang lebih fleksibel namun kompleks. Di implementasi kita, setiap node bisa berperan sebagai Proposer, Acceptor, dan Learner sekaligus.

### Alur 2 Fase Paxos (`src/paxos/`):
1.  **Fase 1: PREPARE (Janji)**
    *   **Proposer** mengirim ID proposal unik ke semua **Acceptors**.
    *   **Acceptor** berjanji: *"Saya tidak akan menerima proposal dengan ID lebih kecil dari ini."*
2.  **Fase 2: ACCEPT (Persetujuan)**
    *   Jika dapat janji dari mayoritas, Proposer mengirim nilai (value) yang diusulkan.
    *   Jika Acceptor masih memegang janjinya, dia menyetujui nilai tersebut.
    *   **Consensus Achieved**: Jika mayoritas menyetujui, nilai tersebut dianggap sah (Learned).

### Cara Eksperimen Paxos:
```bash
# 1. Jalankan cluster Paxos
make pm2-start-paxos

# 2. Kirim proposal nilai baru ke salah satu node:
curl -X POST http://localhost:4001/paxos/propose -H "Content-Type: application/json" -d '{"value": "Nasi Goreng"}'

# 3. Lihat di Dashboard: Semua node paxos akan menyimpan nilai "Nasi Goreng" secara serentak.
```

---

## 📚 4. Library Management System

Aplikasi backend profesional yang mendemonstrasikan fitur CRUD dengan keamanan tinggi.

### Fitur Utama:
*   **Authentication**: Menggunakan JWT (JSON Web Token) dan Passport.js.
*   **RBAC (Role Based Access Control)**:
    *   User memiliki **Role** (Admin, Member).
    *   Role memiliki **Permissions** (create_book, delete_book, dll).
    *   Pengecekan dilakukan secara dinamis via database melalui `PermissionsGuard`.
*   **Database**: PostgreSQL dengan **TypeORM**.
    *   Mendukung **ACID Transactions** (saat registrasi user dan role assignment).
    *   Menggunakan **Migrations** untuk menjaga struktur tabel.

---

## 📊 5. Cluster Dashboard

Dashboard visual untuk monitoring (port 3004).

*   **URL**: `http://localhost:3004/cluster/dashboard`
*   **Visual**: Menampilkan status `ALIVE`/`DOWN`, peran node, term saat ini, dan nilai yang disepakati.
*   **Smart Proxy**: Port 3004 juga bertindak sebagai proxy. Jika kamu hit ke `/cluster/proxy/raft/*`, dia akan otomatis mencarikan siapa Leader yang aktif dan meneruskan request ke sana.

---

## 🛠️ 6. Panduan Deployment (Makefile)

Gunakan perintah `make` untuk mempermudah alur kerja:

| Perintah | Deskripsi |
|---|---|
| `make install` | Install semua dependencies & husky. |
| `make build` | Kompilasi kode TypeScript ke JavaScript. |
| `make db-setup` | Setup database (buat db & jalankan migrasi). |
| `make pm2-start-all` | Jalankan 8 node sekaligus (Raft, Paxos, Lib, Dash). |
| `make docker-build` | Build image Docker untuk node aplikasi. |
| `make k8s-deploy-raft` | Deploy cluster Raft ke Kubernetes. |
| `make helm-deploy` | Deploy seluruh sistem menggunakan Helm Chart. |

---

## 📂 7. Konfigurasi Environment (`.env`)

Pastikan file `.env` sudah dikonfigurasi (lihat `.env.example` sebagai referensi):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=libraries

# Security
JWT_SECRET=super_secret_key
JWT_EXPIRES_IN=60m
```

---

## 🧪 8. Quality Assurance

*   **Linting**: Proyek ini menggunakan **ESLint** dan **Prettier**.
*   **Git Hooks**: Menggunakan **Husky** untuk menjalankan linting sebelum setiap `commit`.
*   **Testing**: Unit testing tersedia untuk Library App (`npm run test`).

---

> **Note**: Untuk simulasi fault tolerance, matikan node lewat PM2 (`npx pm2 stop <id>`) dan perhatikan bagaimana mayoritas node yang tersisa tetap bisa menjaga integritas sistem.
