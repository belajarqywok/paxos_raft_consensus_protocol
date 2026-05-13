import { Module } from '@nestjs/common';
import { RaftController } from './raft.controller';
import { RaftService } from './raft.service';

@Module({
  controllers: [RaftController],
  providers: [RaftService]
})
export class RaftModule {}
