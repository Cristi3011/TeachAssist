import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(
    @Body() body: { username: string; email: string; password: string; role: string },
  ) {
    const saved = await this.userService.createUser(body.username, body.email, body.password, body.role);
    // Return only safe user fields (no id, timestamps, password)
    const { username, email, role } = saved as any;
    return { message: 'Registration successful', user: { username, email, role } };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userService.validateUser(body.email, body.password);
    if (!user) return { message: 'Invalid credentials' };
    // Return only safe user fields (no id, timestamps, password)
    const { username, email, role } = user as any;
    return { message: 'Login successful', user: { username, email, role } };
  }

  @Get()
  async listUsers() {
    const users = await this.userService.findAll();
    // Return only safe fields for the user list (debug endpoint)
    return users.map((u) => {
      const { username, email, role } = u as any;
      return { username, email, role };
    });
  }
}
