import { Controller, Post, Body, Get, Query, ForbiddenException, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { InvitationsService } from '../invitations/invitations.service';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly invites: InvitationsService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { username: string; email: string; password: string; role?: string },
  ) {
    const inv = await this.invites.isInvited(body.email);
    if (!inv) throw new ForbiddenException('Email not invited to register');

    const roleFromInvite = inv.role || 'student';

    const saved = await this.userService.createUser(body.username, body.email, body.password, roleFromInvite);
    
    try { await this.invites.use(body.email); } catch {}

    const { username, email, role } = saved as any;
    return { message: 'Registration successful', user: { username, email, role } };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userService.validateUser(body.email, body.password);
    if (!user) return { message: 'Invalid credentials' };
    const { username, email, role } = user as any;
    const token = this.authService.login(user);
    return { message: 'Login successful', user: { username, email, role }, token };
  }

  @Get()
  async listUsers() {
    const users = await this.userService.findAll();
    return users.map((u) => {
      const { username, email, role, avatarUrl, avatarColor } = u as any;
      return { username, email, role, avatarUrl, avatarColor };
    });
  }

  @Delete()
  async deleteUser(@Query('email') qEmail?: string, @Body() body?: { email?: string }) {
    const email = (qEmail || body?.email || '').toString().toLowerCase().trim();
    if (!email) return { ok: false, message: 'Email missing' };
    try {
      const deleted = await this.userService.deleteByEmail(email);
      if (!deleted) return { ok: false, message: 'User not found' };
      return { ok: true, removed: true };
    } catch (err) {
      return { ok: false, message: (err as any)?.message || 'Could not delete user' };
    }
  }
  
  @Get('check')
  async check(@Query('email') email?: string, @Query('username') username?: string) {
    const emailTaken = email ? !!(await this.userService.findByEmail(email)) : false;
    const usernameTaken = username ? !!(await this.userService.findByUsername(username)) : false;
    return { emailTaken, usernameTaken, ok: !(emailTaken || usernameTaken) };
  }
  
  @Post('avatar')
  async uploadAvatar(@Body() body: { email: string; avatar: string; color?: string | null }) {
    const updated = await this.userService.updateAvatar(body.email, body.avatar, body.color ?? undefined);
    if (!updated) return { ok: false, message: 'User not found' };
    const { username, email, role, avatarUrl } = updated as any;
    return { ok: true, user: { username, email, role, avatarUrl, avatarColor: (updated as any).avatarColor || null } };
  }

  @Post('avatar/color')
  async setAvatarColor(@Body() body: { email: string; color?: string | null }) {
    const updated = await this.userService.updateAvatarColor(body.email, body.color ?? null);
    if (!updated) return { ok: false, message: 'User not found' };
    const { username, email, role, avatarUrl, avatarColor } = updated as any;
    return { ok: true, user: { username, email, role, avatarUrl, avatarColor: avatarColor || null } };
  }
  
}
