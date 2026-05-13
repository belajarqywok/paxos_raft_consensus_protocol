import { Module } from '@nestjs/common';
import { PaxosController } from './paxos.controller';
import { PaxosService } from './paxos.service';

@Module({
  controllers: [PaxosController],
  providers: [PaxosService]
})
export class PaxosModule {}
