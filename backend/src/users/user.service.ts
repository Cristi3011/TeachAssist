import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUser(username: string, email: string, password: string, role: string) {
    // normalize email and check if it already exists to avoid DB unique constraint errors
    const normalizedEmail = (email || '').toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ username, email: normalizedEmail, password: hashedPassword, role });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const found = await this.usersRepository.findOne({ where: { email: normalizedEmail } });
    return found;
  }

  async findByUsername(username: string) {
    const name = (username || '').toString().trim();
    if (!name) return null;
    const found = await this.usersRepository.findOne({ where: { username: name } });
    return found;
  }

  async findAll() {
    return this.usersRepository.find();
  }

  async validateUser(email: string, password: string) {
    console.log('[UserService] validateUser called for email:', email);
    const user = await this.findByEmail(email);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    return user;
  }
}
