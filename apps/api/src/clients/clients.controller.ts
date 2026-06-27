import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/** Carnet de contacts/clients du compte (mini-annuaire + import en masse). */
@UseGuards(JwtGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly db: DbService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.db.listClients(user.accountId, search);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; phone: string; email?: string; notes?: string },
  ) {
    return this.db.createClient({ accountId: user.accountId, ...body });
  }

  /** Import en masse : liste d'objets {name, phone}. */
  @Post('import')
  import(@CurrentUser() user: JwtPayload, @Body() body: { items: { name: string; phone: string }[] }) {
    const imported = this.db.createManyClients(user.accountId, body.items || []);
    return { imported };
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.db.updateClient(user.accountId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { deleted: this.db.deleteClient(user.accountId, id) };
  }
}
