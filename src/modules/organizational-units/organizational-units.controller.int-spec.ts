import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationalUnitsController } from './organizational-units.controller.js';

describe('OrganizationalUnitsController', () => {
  let controller: OrganizationalUnitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationalUnitsController],
    }).compile();

    controller = module.get<OrganizationalUnitsController>(OrganizationalUnitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
