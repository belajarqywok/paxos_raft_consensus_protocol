import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PaxosService implements OnModuleInit {
  private readonly logger = new Logger(PaxosService.name);

  // Identitas Node
  private nodeId: string;
  private peers: string[] = []; // Daftar URL node lain (Acceptors)

  // State Acceptor
  private promisedProposalId: number = 0;
  private acceptedProposalId: number = 0;
  private acceptedValue: any = null;

  // State Proposer (untuk node yang sedang propose)
  private currentProposalId: number = 0;

  // State Learner
  private learnedValue: any = null;

  onModuleInit() {
    const port = process.env.PORT || 3000;
    this.nodeId = `node-${port}`;
    
    // Ambil daftar peer dari env variable PEERS
    if (process.env.PEERS) {
      this.peers = process.env.PEERS.split(',');
    }

    this.logger.log(`Inisialisasi Paxos Node: ${this.nodeId} (Peers: ${this.peers.length})`);
  }

  // ==========================================
  // PERAN PROPOSER
  // ==========================================

  // Fungsi untuk memulai proposal nilai baru
  public async propose(value: any) {
    this.currentProposalId = Date.now(); // Menggunakan timestamp sebagai unique proposal ID yang monotonik naik
    this.logger.log(`Memulai proposal (Phase 1) dengan ID ${this.currentProposalId} dan nilai: ${JSON.stringify(value)}`);

    let promisesCount = 1; // Node sendiri sudah pasti promise jika ID lebih besar
    this.promisedProposalId = this.currentProposalId;
    let highestAcceptedId = this.acceptedProposalId;
    let valueToAccept = value;

    const totalNodes = this.peers.length + 1;
    const majority = Math.floor(totalNodes / 2) + 1;

    // Fase 1: PREPARE (mengirim prepare ke semua Acceptors)
    const preparePromises = this.peers.map(async (peerUrl) => {
      try {
        const response = await axios.post(`${peerUrl}/paxos/prepare`, {
          proposalId: this.currentProposalId
        });
        
        if (response.data.promiseGranted) {
          promisesCount++;
          // Jika Acceptor sudah pernah menerima nilai sebelumnya, Proposer harus
          // menggunakan nilai dari proposal dengan ID tertinggi.
          if (response.data.acceptedProposalId > highestAcceptedId) {
            highestAcceptedId = response.data.acceptedProposalId;
            valueToAccept = response.data.acceptedValue;
          }
        }
      } catch (error) {
        this.logger.verbose(`Gagal mengirim prepare ke ${peerUrl}`);
      }
    });

    await Promise.all(preparePromises);

    // Fase 2: ACCEPT (jika mendapat mayoritas promise, kirim accept request)
    if (promisesCount >= majority) {
      this.logger.log(`Mendapat mayoritas PROMISE. Memasuki Fase 2 (ACCEPT) dengan nilai: ${JSON.stringify(valueToAccept)}`);
      
      let acceptCount = 1; // Node sendiri otomatis menerima
      this.acceptedProposalId = this.currentProposalId;
      this.acceptedValue = valueToAccept;
      
      const acceptPromises = this.peers.map(async (peerUrl) => {
        try {
          const response = await axios.post(`${peerUrl}/paxos/accept`, {
            proposalId: this.currentProposalId,
            value: valueToAccept
          });
          
          if (response.data.accepted) {
            acceptCount++;
          }
        } catch (error) {
          this.logger.verbose(`Gagal mengirim accept ke ${peerUrl}`);
        }
      });

      await Promise.all(acceptPromises);

      // Jika mayoritas menerima (Accept)
      if (acceptCount >= majority) {
        this.logger.log(`KONSENSUS TERCAPAI! Nilai disetujui: ${JSON.stringify(valueToAccept)}`);
        this.learnedValue = valueToAccept;
        return { success: true, message: "Konsensus Tercapai", value: valueToAccept };
      } else {
        this.logger.warn("Gagal mencapai mayoritas pada fase ACCEPT.");
        return { success: false, message: "Gagal pada fase Accept" };
      }
    } else {
      this.logger.warn("Gagal mencapai mayoritas pada fase PREPARE.");
      return { success: false, message: "Gagal pada fase Prepare" };
    }
  }

  // ==========================================
  // PERAN ACCEPTOR
  // ==========================================

  // Menerima pesan Prepare dari Proposer
  public handlePrepare(dto: any) {
    const { proposalId } = dto;
    
    // Jika proposalId lebih besar dari yang pernah kita janjikan (promise)
    if (proposalId > this.promisedProposalId) {
      this.promisedProposalId = proposalId;
      this.logger.log(`Memberikan PROMISE untuk proposal ID ${proposalId}`);
      return {
        promiseGranted: true,
        acceptedProposalId: this.acceptedProposalId,
        acceptedValue: this.acceptedValue
      };
    } else {
      this.logger.verbose(`Menolak PREPARE untuk proposal ID ${proposalId} (sudah berjanji pada ${this.promisedProposalId})`);
      return { promiseGranted: false };
    }
  }

  // Menerima pesan Accept dari Proposer
  public handleAccept(dto: any) {
    const { proposalId, value } = dto;

    // Hanya menerima jika proposalId >= id yang pernah kita janjikan
    if (proposalId >= this.promisedProposalId) {
      this.promisedProposalId = proposalId;
      this.acceptedProposalId = proposalId;
      this.acceptedValue = value;
      this.learnedValue = value; // Sebagai Learner juga, kita simpan nilainya
      this.logger.log(`Menerima ACCEPT untuk proposal ID ${proposalId} dengan nilai ${JSON.stringify(value)}`);
      return { accepted: true };
    } else {
      this.logger.verbose(`Menolak ACCEPT untuk proposal ID ${proposalId}`);
      return { accepted: false };
    }
  }

  // Endpoint untuk melihat state paxos saat ini
  public getStatus() {
    return {
      nodeId: this.nodeId,
      promisedProposalId: this.promisedProposalId,
      acceptedProposalId: this.acceptedProposalId,
      acceptedValue: this.acceptedValue,
      learnedValue: this.learnedValue,
      peers: this.peers
    };
  }
}

