import { Controller, Post, Body, Get } from '@nestjs/common';
import { RaftService } from './raft.service';

@Controller('raft')
export class RaftController {
  constructor(private readonly raftService: RaftService) {}

  // Endpoint untuk menerima permintaan vote dari Candidate
  @Post('request-vote')
  requestVote(@Body() dto: any) {
    return this.raftService.handleRequestVote(dto);
  }

  // Endpoint untuk menerima heartbeat atau log entry dari Leader
  @Post('append-entries')
  appendEntries(@Body() dto: any) {
    return this.raftService.handleAppendEntries(dto);
  }

  // Endpoint tambahan untuk melihat status node saat ini
  @Get('status')
  getStatus() {
    return this.raftService.getStatus();
  }
}

