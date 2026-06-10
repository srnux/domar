import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok with a valid timestamp', () => {
    const health = controller.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('domar-api');
    expect(new Date(health.timestamp).getTime()).not.toBeNaN();
  });
});
