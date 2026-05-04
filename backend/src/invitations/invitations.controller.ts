import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invites: InvitationsService) {}

  @Post()
  async add(@Body() body: { email: string; role?: string }) {
    const saved = await this.invites.add(body.email, body.role);
    return { message: 'Invitatie adaugata', invitation: { email: saved.email, role: saved.role, created_at: saved.created_at } };
  }

  @Get('check')
  async check(@Query('email') email?: string) {
    const inv = await this.invites.isInvited(email || '');
    return { invited: !!inv, role: inv ? inv.role : null };
  }

  @Get()
  async list() {
    const all = await this.invites.list();
    return all.map((i) => ({ email: i.email, role: i.role, used: i.used, created_at: i.created_at }));
  }

  @Delete()
  async remove(@Body() body: { email: string }) {
    const removed = await this.invites.delete(body.email);
    return { removed };
  }
}
