import { Controller, Post, Body, Get, Query, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { InvitationsService } from '../invitations/invitations.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService, private readonly invites: InvitationsService) {}

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
    return { message: 'Login successful', user: { username, email, role } };
  }

  @Get()
  async listUsers() {
    const users = await this.userService.findAll();
    return users.map((u) => {
      const { username, email, role } = u as any;
      return { username, email, role };
    });
  }
  
  @Get('check')
  async check(@Query('email') email?: string, @Query('username') username?: string) {
    const emailTaken = email ? !!(await this.userService.findByEmail(email)) : false;
    const usernameTaken = username ? !!(await this.userService.findByUsername(username)) : false;
    return { emailTaken, usernameTaken, ok: !(emailTaken || usernameTaken) };
  }
  
}
