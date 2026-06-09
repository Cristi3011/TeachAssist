import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const expires: any = process.env.JWT_ACCESS_EXPIRES || '15m';
    return { accessToken: this.jwtService.sign(payload as any, { expiresIn: expires as any } as any) };
  }
}
