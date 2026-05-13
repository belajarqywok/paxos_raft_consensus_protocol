import { Controller, Get, Post, Body, Res, All, Req } from '@nestjs/common';
import { ClusterService } from './cluster.service';
import axios from 'axios';

@Controller('cluster')
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  // 1. Dashboard UI (Bisa dibuka di browser)
  @Get('dashboard')
  async getDashboard(@Res() res: any) {
    const status = await this.clusterService.getClusterStatus();
    const html = this.clusterService.renderHtml(status);
    res.type('text/html').send(html);
  }

  // 2. JSON Status API
  @Get('status')
  async getStatus() {
    return this.clusterService.getClusterStatus();
  }

  // 3. Smart Proxy untuk Raft
  // Contoh: POST http://localhost:3004/cluster/proxy/raft/append-entries
  @All('proxy/raft/*')
  async proxyRaft(@Req() req: any, @Body() body: any) {
    const leaderUrl = await this.clusterService.getRaftLeader();
    if (!leaderUrl) {
      return { error: 'No Raft Leader active at the moment.' };
    }

    const path = req.url.replace('/cluster/proxy/raft/', '');
    const fullUrl = `${leaderUrl}/raft/${path}`;

    try {
      const response = await axios({
        method: req.method,
        url: fullUrl,
        data: body,
      });
      return {
        _proxiedTo: leaderUrl,
        data: response.data,
      };
    } catch (error) {
      return {
        error: `Proxy failed to ${fullUrl}`,
        message: error.message,
      };
    }
  }
}
