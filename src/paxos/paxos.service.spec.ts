import { Test, TestingModule } from '@nestjs/testing';
import { PaxosService } from './paxos.service';

describe('PaxosService', () => {
  let service: PaxosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaxosService],
    }).compile();

    service = module.get<PaxosService>(PaxosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
