import { Controller, Post, Body, Get } from '@nestjs/common';
import { PaxosService } from './paxos.service';

@Controller('paxos')
export class PaxosController {
  constructor(private readonly paxosService: PaxosService) {}

  // Endpoint untuk klien (user) memulai proposal nilai baru
  @Post('propose')
  propose(@Body() dto: { value: any }) {
    return this.paxosService.propose(dto.value);
  }

  // Endpoint untuk Acceptor menerima pesan prepare dari Proposer
  @Post('prepare')
  prepare(@Body() dto: any) {
    return this.paxosService.handlePrepare(dto);
  }

  // Endpoint untuk Acceptor menerima pesan accept dari Proposer
  @Post('accept')
  accept(@Body() dto: any) {
    return this.paxosService.handleAccept(dto);
  }

  // Endpoint tambahan untuk melihat status paxos saat ini
  @Get('status')
  getStatus() {
    return this.paxosService.getStatus();
  }
}

