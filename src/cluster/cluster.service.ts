import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);

  // Daftar semua node yang akan dipantau
  private readonly raftNodes = [
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
  ];

  private readonly paxosNodes = [
    'http://127.0.0.1:4001',
    'http://127.0.0.1:4002',
    'http://127.0.0.1:4003',
  ];

  async getClusterStatus() {
    const raftStatus = await Promise.all(
      this.raftNodes.map(async (url) => this.checkNode(url, 'raft')),
    );
    const paxosStatus = await Promise.all(
      this.paxosNodes.map(async (url) => this.checkNode(url, 'paxos')),
    );

    return {
      timestamp: new Date().toISOString(),
      raft: raftStatus,
      paxos: paxosStatus,
    };
  }

  private async checkNode(url: string, type: 'raft' | 'paxos') {
    try {
      const response = await axios.get(`${url}/${type}/status`, { timeout: 1000 });
      return {
        url,
        alive: true,
        data: response.data,
      };
    } catch (error) {
      return {
        url,
        alive: false,
        error: 'Node Down',
      };
    }
  }

  async getRaftLeader() {
    const status = await this.getClusterStatus();
    const leader = status.raft.find((n) => n.alive && n.data?.state === 'LEADER');
    return leader ? leader.url : null;
  }

  // Fungsi untuk merender HTML Dashboard Premium
  renderHtml(status: any) {
    const createRaftRows = (nodes: any[]) =>
      nodes
        .map(
          (n) => `
        <tr class="${n.alive && n.data.state === 'LEADER' ? 'leader-row' : ''}">
          <td class="node-instance-text">${n.url}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="status-dot ${n.alive ? 'bg-success heartbeat' : 'bg-danger'} me-2"></div>
              <span class="status-text ${n.alive ? 'text-success' : 'text-danger'}">${n.alive ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </td>
          <td>
            <span class="badge-role ${n.alive && n.data.state === 'LEADER' ? 'leader-badge' : 'follower-badge'}">
              <i class="fas ${n.alive && n.data.state === 'LEADER' ? 'fa-crown' : 'fa-user-shield'} me-1"></i>
              ${n.alive ? n.data.state : 'UNKNOWN'}
            </span>
          </td>
          <td class="text-info fw-mono">${n.alive ? n.data.currentTerm : '--'}</td>
        </tr>`,
        )
        .join('');

    const createPaxosRows = (nodes: any[]) =>
      nodes
        .map(
          (n) => `
        <tr>
          <td class="node-instance-text">${n.url}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="status-dot ${n.alive ? 'bg-success heartbeat' : 'bg-danger'} me-2"></div>
              <span class="status-text ${n.alive ? 'text-success' : 'text-danger'}">${n.alive ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </td>
          <td>
            <div class="value-container">
              <i class="fas fa-database me-2 opacity-50"></i>
              <code class="learned-value">${n.alive ? (n.data.learnedValue !== null ? JSON.stringify(n.data.learnedValue) : 'Empty') : '--'}</code>
            </div>
          </td>
          <td class="text-warning fw-mono">${n.alive ? n.data.promisedProposalId : '--'}</td>
        </tr>`,
        )
        .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Consensus Dashboard Pro</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <meta http-equiv="refresh" content="3">
        <style>
          :root {
            --bg-deep: #0a0b10;
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --primary-glow: #00d2ff;
            --leader-gold: #ffcc33;
          }
          
          body { 
            background: var(--bg-deep); 
            background-image: radial-gradient(circle at 50% -20%, #1a1f35 0%, var(--bg-deep) 70%);
            color: #e0e6ed; 
            padding: 40px 20px; 
            font-family: 'Outfit', sans-serif;
            min-height: 100vh;
          }

          .glass-card {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 24px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .glass-card:hover {
            transform: translateY(-5px);
            border-color: rgba(0, 210, 255, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }

          .header-section {
            margin-bottom: 40px;
            text-align: center;
          }

          h1 { 
            font-weight: 700; 
            letter-spacing: -1px; 
            background: linear-gradient(to right, #fff, #8892b0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .table { color: #e0e6ed; --bs-table-bg: transparent; margin-bottom: 0; }
          .table thead th { border-bottom: 2px solid var(--glass-border); color: #8892b0; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
          .table td { border-bottom: 1px solid var(--glass-border); padding: 16px 8px; }

          .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          .heartbeat { animation: heart-beat 2s infinite; box-shadow: 0 0 10px currentColor; }
          
          @keyframes heart-beat {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }

          .badge-role {
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
          }

          .leader-badge { 
            background: rgba(255, 204, 51, 0.1); 
            color: var(--leader-gold); 
            border: 1px solid rgba(255, 204, 51, 0.3);
            box-shadow: 0 0 15px rgba(255, 204, 51, 0.1);
          }

          .follower-badge { background: rgba(255, 255, 255, 0.05); color: #8892b0; border: 1px solid var(--glass-border); }

          .leader-row { background: rgba(0, 210, 255, 0.02); }
          .leader-row td { border-bottom-color: rgba(0, 210, 255, 0.2); }

          .fw-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
          .learned-value { color: #00d2ff; background: rgba(0, 210, 255, 0.05); padding: 4px 10px; border-radius: 6px; }
          
          .node-instance-text { 
            color: #ffff00 !important; 
            font-size: 1.1rem !important;
            font-weight: 700 !important;
            text-shadow: 0 0 10px rgba(255, 255, 0, 0.5); 
          }
          .info-footer-text { color: #e0e6ed; }
          .highlight-info { color: #00d2ff; font-weight: 600; text-shadow: 0 0 8px rgba(0, 210, 255, 0.4); }

          .footer-stats {
            background: rgba(0,0,0,0.2);
            border-radius: 15px;
            padding: 10px 20px;
            display: inline-flex;
            gap: 20px;
            font-size: 0.85rem;
            color: #8892b0;
          }
        </style>
      </head>
      <body>
        <div class="container-fluid max-width-container">
          <div class="header-section">
            <h1 class="display-5 mb-1">Consensus Infrastructure</h1>
            <div class="footer-stats border border-secondary border-opacity-10">
              <span><i class="fas fa-sync fa-spin me-2"></i>Refresh: 3s</span>
              <span><i class="fas fa-network-wired me-2"></i>Nodes: 6 Active</span>
              <span><i class="fas fa-clock me-2"></i>${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div class="row g-4">
            <!-- RAFT CARD -->
            <div class="col-xl-6">
              <div class="glass-card h-100">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h4 class="mb-0 fw-bold text-white"><i class="fas fa-shield-halved me-2 text-primary"></i>Raft Consensus</h4>
                  <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3">Port 3001-3003</span>
                </div>
                <div class="table-responsive">
                  <table class="table">
                    <thead><tr><th>Node Instance</th><th>Health</th><th>Role</th><th>Term</th></tr></thead>
                    <tbody>${createRaftRows(status.raft)}</tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- PAXOS CARD -->
            <div class="col-xl-6">
              <div class="glass-card h-100">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h4 class="mb-0 fw-bold text-white"><i class="fas fa-vial-circle-check me-2 text-warning"></i>Paxos Protocol</h4>
                  <span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3">Port 4001-4003</span>
                </div>
                <div class="table-responsive">
                  <table class="table">
                    <thead><tr><th>Node Instance</th><th>Health</th><th>Learned Value</th><th>Promise ID</th></tr></thead>
                    <tbody>${createPaxosRows(status.paxos)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <div class="text-center mt-5">
            <p class="info-footer-text small">
              <i class="fas fa-info-circle me-1"></i> 
              System operates on <span class="highlight-info">majority-based quorum</span>. At least 2 nodes per cluster must be online to maintain stability.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
