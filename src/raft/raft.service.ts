import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

type RaftState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

@Injectable()
export class RaftService implements OnModuleInit {
  private readonly logger = new Logger(RaftService.name);

  // State fundamental Raft
  private state: RaftState = 'FOLLOWER';
  private currentTerm: number = 0;
  private votedFor: string | null = null;
  private logs: any[] = []; // Sederhananya, ini menyimpan data yang direplikasi
  
  // Konfigurasi Node
  private nodeId: string;
  private peers: string[] = []; // Daftar URL node lain
  
  // Timers
  private electionTimeout: NodeJS.Timeout;
  private heartbeatInterval: NodeJS.Timeout;

  onModuleInit() {
    const port = process.env.PORT || 3000;
    this.nodeId = `node-${port}`;
    
    // Ambil daftar peer dari env variable PEERS (dipisahkan dengan koma)
    // Contoh: PEERS=http://localhost:3001,http://localhost:3002
    if (process.env.PEERS) {
      this.peers = process.env.PEERS.split(',');
    }

    this.logger.log(`Inisialisasi Raft Node: ${this.nodeId} (Peers: ${this.peers.length})`);
    
    // Mulai sebagai Follower dan mulai timer pemilihan
    this.resetElectionTimeout();
  }

  // ---- FUNGSI INTERNAL TIMER ----

  // Mereset timer election. Jika tidak ada heartbeat dari leader, node menjadi Candidate.
  private resetElectionTimeout() {
    if (this.electionTimeout) clearTimeout(this.electionTimeout);
    
    // Timeout acak antara 150ms - 300ms (fundamental raft)
    // Untuk simulasi agar lebih mudah diamati, kita perbesar jadi 3000ms - 6000ms
    const timeout = Math.floor(Math.random() * 3000) + 3000;
    
    this.electionTimeout = setTimeout(() => {
      this.startElection();
    }, timeout);
  }

  // Fungsi yang dipanggil saat timer election habis
  private async startElection() {
    this.state = 'CANDIDATE';
    this.currentTerm++;
    this.votedFor = this.nodeId; // Vote untuk diri sendiri
    
    this.logger.log(`Memulai Election untuk Term ${this.currentTerm}`);
    this.resetElectionTimeout(); // Reset timer election untuk mengantisipasi split vote

    let votesReceived = 1; // Sudah vote diri sendiri
    const totalNodes = this.peers.length + 1;
    const majority = Math.floor(totalNodes / 2) + 1;

    // Meminta vote ke semua node lain (peer)
    const votePromises = this.peers.map(async (peerUrl) => {
      try {
        const response = await axios.post(`${peerUrl}/raft/request-vote`, {
          term: this.currentTerm,
          candidateId: this.nodeId,
          lastLogIndex: this.logs.length - 1,
          lastLogTerm: this.logs.length > 0 ? this.logs[this.logs.length - 1].term : 0,
        });
        
        if (response.data.voteGranted) {
          votesReceived++;
        }
      } catch (error) {
        this.logger.error(`Gagal meminta vote dari ${peerUrl}`);
      }
    });

    await Promise.all(votePromises);

    // Jika mendapat vote mayoritas dan masih berstatus Candidate
    if (votesReceived >= majority && this.state === 'CANDIDATE') {
      this.logger.log(`Terpilih sebagai LEADER pada Term ${this.currentTerm} dengan ${votesReceived} suara.`);
      this.becomeLeader();
    }
  }

  private becomeLeader() {
    this.state = 'LEADER';
    if (this.electionTimeout) clearTimeout(this.electionTimeout);
    
    this.sendHeartbeats();
    // Kirim heartbeat secara berkala
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, 1500); // Heartbeat setiap 1.5 detik
  }

  // Mengirim pesan "AppendEntries" ke semua node (sebagai Heartbeat atau Log Replication)
  private sendHeartbeats() {
    this.peers.forEach(async (peerUrl) => {
      try {
        await axios.post(`${peerUrl}/raft/append-entries`, {
          term: this.currentTerm,
          leaderId: this.nodeId,
          entries: [], // Kosong karena ini hanya heartbeat simulasi
          leaderCommit: this.logs.length - 1
        });
      } catch (error) {
        this.logger.verbose(`Gagal mengirim heartbeat ke ${peerUrl}`);
      }
    });
  }

  // ---- ENDPOINT HANDLERS ----

  // Menangani request vote dari node lain (Candidate)
  public handleRequestVote(dto: any) {
    let voteGranted = false;

    // Jika term candidate lebih besar, perbarui term kita dan jadi follower lagi
    if (dto.term > this.currentTerm) {
      this.currentTerm = dto.term;
      this.state = 'FOLLOWER';
      this.votedFor = null;
    }

    // Node hanya akan memberi vote jika term sesuai, dan belum memberikan vote pada term tersebut
    if (dto.term === this.currentTerm && (this.votedFor === null || this.votedFor === dto.candidateId)) {
      voteGranted = true;
      this.votedFor = dto.candidateId;
      this.resetElectionTimeout(); // Reset timer karena kita mengakui adanya aktivitas dari node lain
      this.logger.log(`Memberikan VOTE untuk ${dto.candidateId} pada term ${this.currentTerm}`);
    }

    return { term: this.currentTerm, voteGranted };
  }

  // Menangani heartbeat atau perintah replikasi dari Leader
  public handleAppendEntries(dto: any) {
    if (dto.term >= this.currentTerm) {
      // Jika term sesuai atau lebih baru, akui dia sebagai Leader
      this.currentTerm = dto.term;
      this.state = 'FOLLOWER';
      this.votedFor = null;
      
      // Reset timeout election karena kita sudah menerima heartbeat dari Leader
      this.resetElectionTimeout();
      
      // Jika sebelumnya kita Leader, hentikan heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null as any;
      }
      
      this.logger.verbose(`Menerima HEARTBEAT dari Leader ${dto.leaderId} pada term ${this.currentTerm}`);
      return { term: this.currentTerm, success: true };
    }
    
    return { term: this.currentTerm, success: false };
  }

  // Mengembalikan status/state dari node ini
  public getStatus() {
    return {
      nodeId: this.nodeId,
      state: this.state,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      peers: this.peers
    };
  }
}
