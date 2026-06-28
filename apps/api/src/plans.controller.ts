import { Controller, Get } from '@nestjs/common';
import { DbService } from './db/db.service';

/** Formules publiques (affichage app/site) — uniquement les formules actives. */
@Controller('plans')
export class PlansController {
  constructor(private readonly db: DbService) {}

  @Get()
  list() {
    return { plans: this.db.listPlans().filter((p) => p.active) };
  }
}
