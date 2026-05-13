# 📚 Dokumentasi: Raft & Paxos Consensus Protocol

> Dokumentasi ini ditulis khusus berdasarkan kode yang ada di proyek ini.
> Semua contoh merujuk langsung ke file di folder `src/raft/` dan `src/paxos/`.

---

## 🤔 Apa itu Consensus Protocol?

Bayangkan kamu dan 2 temanmu perlu memutuskan mau makan di mana malam ini. Masalahnya, kalian tidak bisa langsung ketemu, hanya bisa kirim pesan. Bagaimana caranya kalian bisa **sepakat pada satu keputusan yang sama**, meskipun ada salah satu dari kalian yang tiba-tiba tidak bisa dihubungi?

Di dunia sistem terdistribusi (banyak server yang saling berkomunikasi), masalah ini disebut **Distributed Consensus** — bagaimana banyak node/server bisa **mencapai kata sepakat** meskipun ada yang mati atau lambat.

**Raft** dan **Paxos** adalah dua algoritma paling terkenal untuk menyelesaikan masalah ini.

---

## 🏃 BAGIAN 1: RAFT

> File: `src/raft/raft.service.ts` dan `src/raft/raft.controller.ts`

### Analogi Raft: Pilkada di Kantor

Bayangkan ada **3 karyawan** (node) dalam sebuah tim. Tim ini perlu punya **satu Ketua** (Leader) yang mengatur semua pekerjaan. Kalau Ketua tiba-tiba resign (mati), tim harus segera pilih Ketua baru.

Itulah inti dari Raft.

---

### 🎭 3 Peran di Raft

Di kode ini, semua node bisa menjadi salah satu dari 3 peran ini:

```typescript
// src/raft/raft.service.ts - baris 4
type RaftState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';
```

| Peran | Analogi | Tugasnya |
|---|---|---|
| `FOLLOWER` | Karyawan biasa | Dengerin perintah Leader, kalau Leader hilang → maju jadi kandidat |
| `CANDIDATE` | Calon Ketua | Lagi kampanye, minta vote ke semua teman |
| `LEADER` | Ketua terpilih | Kirim "tanda tangan kehadiran" (heartbeat) ke semua follower |

Semua node **mulai sebagai FOLLOWER**:
```typescript
// src/raft/raft.service.ts - baris 11
private state: RaftState = 'FOLLOWER';
```

---

### 🔢 Apa itu "Term"?

**Term** adalah nomor periode kepemimpinan. Setiap kali ada pemilihan baru, nomor term naik.

```typescript
// src/raft/raft.service.ts - baris 12
private currentTerm: number = 0;
```

Analogi: Term 1 = periode Pak Budi jadi Ketua. Pak Budi resign, ada pemilihan baru → Term 2. Ibu Sari terpilih → Term 2 = periode Ibu Sari.

Gunanya: **mencegah pemimpin lama yang baru "bangkit" kembali** tiba-tiba mengklaim dirinya masih pemimpin padahal sudah outdated. Node dengan term lebih kecil otomatis kalah.

---

### ⏰ Election Timeout: Alarm "Leader Hilang!"

Setiap Follower punya **timer alarm**. Kalau dalam waktu tertentu tidak ada kabar dari Leader, alarm berbunyi → "Leader kelihatannya mati, aku harus maju sebagai Kandidat!"

```typescript
// src/raft/raft.service.ts - baris 46-52
// Timeout acak antara 3000ms - 6000ms (di implementasi aslinya 150-300ms)
// Dibuat acak supaya tidak semua node maju jadi kandidat di waktu yang sama!
const timeout = Math.floor(Math.random() * 3000) + 3000;

this.electionTimeout = setTimeout(() => {
  this.startElection(); // Jika alarm bunyi, mulai proses pemilihan
}, timeout);
```

> **Kenapa acak?**
> Kalau semua timer sama persis, semua node akan jadi Kandidat bersamaan dan tidak ada yang menang (split vote). Dengan timer acak, biasanya ada 1 node yang duluan dan langsung menang sebelum yang lain sempat maju.

---

### 🗳️ Proses Pemilihan (Leader Election)

Ini adalah inti dari Raft. Terjadi di fungsi `startElection()`:

**Langkah-langkahnya:**

1. **Node berubah jadi CANDIDATE** dan naikkan term
2. **Vote untuk diri sendiri** terlebih dahulu
3. **Minta vote ke semua peer** via HTTP `POST /raft/request-vote`
4. **Jika dapat suara mayoritas** → jadi LEADER

```typescript
// src/raft/raft.service.ts - baris 56-93
private async startElection() {
  this.state = 'CANDIDATE';
  this.currentTerm++;           // Term naik
  this.votedFor = this.nodeId;  // Vote diri sendiri dulu
  
  let votesReceived = 1; // Sudah 1 suara (dari diri sendiri)
  const majority = Math.floor(totalNodes / 2) + 1; // Butuh > 50% suara

  // Kirim permintaan vote ke semua peer
  await axios.post(`${peerUrl}/raft/request-vote`, {
    term: this.currentTerm,
    candidateId: this.nodeId,
    ...
  });

  // Kalau dapat suara cukup → jadi LEADER!
  if (votesReceived >= majority && this.state === 'CANDIDATE') {
    this.becomeLeader();
  }
}
```

**Kapan node mau memberikan vote?**

Node hanya memberikan vote kalau:
- Term kandidat **≥** term-nya sendiri
- Belum pernah vote ke orang lain di term yang sama (`votedFor === null`)

```typescript
// src/raft/raft.service.ts - baris 136-139
if (dto.term === this.currentTerm && (this.votedFor === null || this.votedFor === dto.candidateId)) {
  voteGranted = true;
  this.votedFor = dto.candidateId; // Catat: sudah vote ke kandidat ini
}
```

---

### 💓 Heartbeat: "Aku Masih Hidup!"

Setelah jadi Leader, node wajib rutin mengirim sinyal **heartbeat** ke semua follower via `POST /raft/append-entries`:

```typescript
// src/raft/raft.service.ts - baris 101-104
this.heartbeatInterval = setInterval(() => {
  this.sendHeartbeats();
}, 1500); // Kirim heartbeat setiap 1.5 detik
```

Kalau Follower menerima heartbeat → reset alarm mereka → "Oke, Leader masih hidup, tenang."

```typescript
// src/raft/raft.service.ts - baris 154-155
// Reset timeout election karena kita sudah menerima heartbeat dari Leader
this.resetElectionTimeout();
```

Kalau heartbeat **berhenti datang** (Leader mati) → alarm Follower bunyi → pemilihan baru dimulai!

---

### 🌐 API Endpoint Raft

Di `src/raft/raft.controller.ts`, ada 3 endpoint:

| Method | URL | Siapa yang memanggilnya | Gunanya |
|---|---|---|---|
| `POST` | `/raft/request-vote` | Kandidat → memanggil ke peer lain | Minta suara |
| `POST` | `/raft/append-entries` | Leader → memanggil ke semua follower | Kirim heartbeat |
| `GET` | `/raft/status` | Kamu (untuk monitoring) | Lihat state node saat ini |

**Cara coba (setelah `make pm2-start-raft`):**

```bash
# Lihat status node 1
curl http://localhost:3001/raft/status

# Contoh response:
# {
#   "nodeId": "node-3001",
#   "state": "LEADER",       ← Bisa FOLLOWER, CANDIDATE, atau LEADER
#   "currentTerm": 2,
#   "votedFor": "node-3001",
#   "peers": ["http://127.0.0.1:3002", "http://127.0.0.1:3003"]
# }
```

---

### 🔄 Ringkasan Alur Raft

```
Semua node mulai sebagai FOLLOWER
        │
        │ (timer election habis, tidak ada heartbeat)
        ▼
   Jadi CANDIDATE
   - Naikkan term
   - Vote diri sendiri
   - Kirim RequestVote ke semua peer
        │
        ├─── Dapat suara mayoritas? ──YES──▶ Jadi LEADER
        │                                    - Kirim heartbeat tiap 1.5 detik
        │                                    - Kalau dapat heartbeat dari Leader lain
        │                                      dengan term lebih tinggi → turun jadi FOLLOWER
        │
        └─── Tidak dapat mayoritas ──▶ Kembali jadi FOLLOWER, tunggu timer lagi
```

---
---

## ⚖️ BAGIAN 2: PAXOS

> File: `src/paxos/paxos.service.ts` dan `src/paxos/paxos.controller.ts`

### Analogi Paxos: Rapat untuk Menyetujui Satu Keputusan

Bayangkan ada **3 orang** dalam sebuah rapat. Salah satu dari mereka ingin mengusulkan keputusan (misalnya: "Menu kantin hari ini adalah Nasi Padang"). Agar keputusan sah, harus ada persetujuan dari **mayoritas peserta rapat**.

Bedanya dengan Raft: di Paxos **tidak ada konsep Leader tetap**. Siapa saja bisa jadi **Proposer** kapan saja. Tapi proses persetujuannya lebih terstruktur — ada dua tahap yang wajib dilewati.

---

### 🎭 3 Peran di Paxos

Di kode ini, **setiap node menjalankan ketiga peran sekaligus** (ini yang dikenal sebagai "Multi-Paxos sederhana"):

| Peran | Analogi | Tugasnya |
|---|---|---|
| **Proposer** | Pengusul | Yang memulai proposal, menjalankan 2 fase |
| **Acceptor** | Peserta rapat | Yang menyetujui atau menolak proposal |
| **Learner** | Pencatat notulen | Yang menyimpan keputusan akhir |

```typescript
// src/paxos/paxos.service.ts

// State sebagai Acceptor
private promisedProposalId: number = 0;  // ID proposal tertinggi yang pernah dijanjikan
private acceptedProposalId: number = 0;  // ID proposal yang sudah diterima
private acceptedValue: any = null;        // Nilai yang sudah diterima

// State sebagai Learner
private learnedValue: any = null;         // Nilai final yang sudah disetujui
```

---

### 🔑 Apa itu Proposal ID?

Setiap proposal harus punya **ID yang unik dan selalu naik**. Di implementasi ini, digunakan **timestamp** (`Date.now()`):

```typescript
// src/paxos/paxos.service.ts - baris 41
this.currentProposalId = Date.now(); // Timestamp = otomatis unik dan monoton naik
```

Gunanya: Node Acceptor akan **menolak proposal dengan ID lama** dan hanya merespons proposal dengan ID terbaru. Ini mencegah konflik kalau ada dua Proposer aktif bersamaan.

---

### 📋 Fase 1: PREPARE → PROMISE

Ini adalah "langkah pendahuluan" — Proposer bertanya dulu: *"Boleh saya usul ya? Saya pakai ID sekian."*

**Proposer kirim PREPARE:**
```typescript
// src/paxos/paxos.service.ts - baris 53-57
await axios.post(`${peerUrl}/paxos/prepare`, {
  proposalId: this.currentProposalId  // "Aku mau usul dengan ID ini"
});
```

**Acceptor membalas PROMISE (atau menolak):**

Acceptor akan memberi janji (`promiseGranted: true`) hanya kalau `proposalId` yang datang **lebih besar** dari ID yang pernah dijanjikan sebelumnya:

```typescript
// src/paxos/paxos.service.ts - baris 123-135
if (proposalId > this.promisedProposalId) {
  this.promisedProposalId = proposalId; // Catat: sudah janji ke proposal ini
  return {
    promiseGranted: true,
    acceptedProposalId: this.acceptedProposalId, // Info: pernah terima proposal apa?
    acceptedValue: this.acceptedValue             // Info: nilainya apa?
  };
} else {
  return { promiseGranted: false }; // Tolak! Sudah janji ke proposal dengan ID lebih besar
}
```

> **Kenapa Acceptor mengirim balik nilai yang pernah diterima?**
> Ini penting! Kalau ternyata ada node lain yang sudah pernah mengusulkan dan diterima mayoritas, Proposer harus "hormat" dan melanjutkan nilai itu, bukan nilai barunya sendiri.

```typescript
// src/paxos/paxos.service.ts - baris 62-65
// Kalau Acceptor sudah pernah menerima sesuatu dengan ID lebih tinggi,
// kita harus gunakan nilai itu, bukan nilai yang ingin kita usulkan sendiri
if (response.data.acceptedProposalId > highestAcceptedId) {
  valueToAccept = response.data.acceptedValue; // Ganti ke nilai yang sudah ada
}
```

---

### ✅ Fase 2: ACCEPT → ACCEPTED

Kalau Proposer sudah dapat **Promise dari mayoritas** node, baru boleh kirim **Accept Request**:

```typescript
// src/paxos/paxos.service.ts - baris 83-88
await axios.post(`${peerUrl}/paxos/accept`, {
  proposalId: this.currentProposalId,
  value: valueToAccept  // Nilai yang akan di-commit
});
```

Acceptor akan menerima (`accepted: true`) kalau `proposalId` **≥** ID yang pernah dijanjikan:

```typescript
// src/paxos/paxos.service.ts - baris 143-149
if (proposalId >= this.promisedProposalId) {
  this.acceptedProposalId = proposalId;
  this.acceptedValue = value;
  this.learnedValue = value; // Simpan sebagai nilai final (peran Learner)
  return { accepted: true };
}
```

Kalau mayoritas Acceptor menerima → **Konsensus Tercapai!**

```typescript
// src/paxos/paxos.service.ts - baris 101-104
if (acceptCount >= majority) {
  this.logger.log(`KONSENSUS TERCAPAI! Nilai disetujui: ${JSON.stringify(valueToAccept)}`);
  this.learnedValue = valueToAccept;
  return { success: true, message: "Konsensus Tercapai", value: valueToAccept };
}
```

---

### 🌐 API Endpoint Paxos

Di `src/paxos/paxos.controller.ts`, ada 4 endpoint:

| Method | URL | Siapa yang memanggilnya | Gunanya |
|---|---|---|---|
| `POST` | `/paxos/propose` | **Kamu** (trigger manual) | Mulai proses konsensus |
| `POST` | `/paxos/prepare` | Proposer → memanggil ke peer lain | Fase 1: minta janji |
| `POST` | `/paxos/accept` | Proposer → memanggil ke peer lain | Fase 2: minta persetujuan |
| `GET` | `/paxos/status` | Kamu (untuk monitoring) | Lihat state node saat ini |

**Cara coba (setelah `make pm2-start-paxos`):**

```bash
# Trigger konsensus dari node 1 (port 4001)
curl -X POST http://localhost:4001/paxos/propose \
  -H "Content-Type: application/json" \
  -d '{"value": "Nasi Padang"}'

# Kalau berhasil:
# { "success": true, "message": "Konsensus Tercapai", "value": "Nasi Padang" }

# Lihat hasilnya di semua node
curl http://localhost:4001/paxos/status
curl http://localhost:4002/paxos/status
curl http://localhost:4003/paxos/status
# → learnedValue di semua node harusnya sama: "Nasi Padang"
```

---

### 🔄 Ringkasan Alur Paxos

```
Kamu POST /paxos/propose { value: "Nasi Padang" }
        │
        ▼
   [FASE 1: PREPARE]
   Proposer (node-4001) kirim PREPARE ke node-4002 dan node-4003
        │
        ├── node-4002 balas PROMISE ✓
        ├── node-4003 balas PROMISE ✓
        │   (mayoritas = 2 dari 3 → lanjut ke fase 2)
        │
        ▼
   [FASE 2: ACCEPT]
   Proposer kirim ACCEPT { proposalId, value: "Nasi Padang" } ke semua peer
        │
        ├── node-4002 balas ACCEPTED ✓
        ├── node-4003 balas ACCEPTED ✓
        │   (mayoritas = 2 dari 3 → KONSENSUS TERCAPAI!)
        │
        ▼
   Semua node menyimpan learnedValue = "Nasi Padang" ✅
```

---
---

## 🆚 Raft vs Paxos: Apa Bedanya?

| Aspek | Raft | Paxos |
|---|---|---|
| **Konsep utama** | Ada 1 Leader tetap yang pegang kendali | Siapa saja bisa jadi Proposer kapan saja |
| **Cara konsensus** | Semua keputusan lewat Leader dulu | Proposer langsung negosiasi dengan Acceptors |
| **Trigger** | Otomatis (timer election berjalan sendiri) | Manual (kamu harus `POST /paxos/propose`) |
| **Keseragaman data** | Leader replikasi log ke semua Follower | Setiap proposal diproses satu per satu |
| **Kemudahan dipahami** | Lebih mudah | Lebih sulit, tapi lebih fleksibel |
| **Contoh penggunaan nyata** | etcd (Kubernetes), CockroachDB | Apache Zookeeper, Google Chubby |

---

## 🛠️ Cara Jalankan & Eksperimen

### Jalankan Raft (3 node)

```bash
make build
make pm2-start-raft

# Lalu pantau log untuk lihat proses election dan heartbeat
make pm2-logs
# → Kamu akan lihat output seperti:
# [RaftService] Memulai Election untuk Term 1
# [RaftService] Memberikan VOTE untuk node-3001 pada term 1
# [RaftService] Terpilih sebagai LEADER pada Term 1 dengan 2 suara.
# [RaftService] Menerima HEARTBEAT dari Leader node-3001 pada term 1
```

**Eksperimen seru:** Coba matikan node yang jadi Leader, lalu lihat node lain otomatis mengadakan pemilihan baru!

```bash
# Matikan hanya raft-1 (yang mungkin sedang jadi Leader)
npx pm2 stop raft-1

# Pantau log raft-2 dan raft-3, mereka akan otomatis pilih Leader baru
npx pm2 logs raft-2
```

### Jalankan Paxos (3 node)

```bash
make build
make pm2-start-paxos

# Trigger konsensus manual
curl -X POST http://localhost:4001/paxos/propose \
  -H "Content-Type: application/json" \
  -d '{"value": "Pilihan Kita"}'

# Cek apakah semua node sepakat
curl http://localhost:4001/paxos/status
curl http://localhost:4002/paxos/status
curl http://localhost:4003/paxos/status
```

**Eksperimen seru:** Coba matikan 1 node (dari 3), lalu propose lagi. Konsensus harusnya masih bisa tercapai karena mayoritas (2 dari 3) masih hidup!

```bash
npx pm2 stop paxos-3  # Matikan 1 node

# Propose ke node yang masih hidup → tetap bisa konsensus (2 dari 3 cukup)
curl -X POST http://localhost:4001/paxos/propose \
  -H "Content-Type: application/json" \
  -d '{"value": "Tetap Bisa Konsensus!"}'
```

---

## 📖 Referensi Lebih Lanjut

- **Raft Paper (yang enak dibaca):** https://raft.github.io/
- **Raft Visualisasi Interaktif:** https://raft.github.io/raftscope/
- **Paxos Made Simple (Leslie Lamport):** https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
- **Paxos Explained visually:** https://martinfowler.com/articles/patterns-of-distributed-systems/paxos.html
