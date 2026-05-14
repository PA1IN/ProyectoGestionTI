import { Test, TestingModule } from '@nestjs/testing';
import { ProcesamientoService } from './procesamiento.service';

describe('ProcesamientoService', () => {
  let service: ProcesamientoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcesamientoService],
    }).compile();

    service = module.get<ProcesamientoService>(ProcesamientoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
