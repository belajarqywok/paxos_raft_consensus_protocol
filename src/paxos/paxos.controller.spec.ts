import { Test, TestingModule } from '@nestjs/testing';
import { PaxosController } from './paxos.controller';

describe('PaxosController', () => {
  let controller: PaxosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaxosController],
    }).compile();

    controller = module.get<PaxosController>(PaxosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
