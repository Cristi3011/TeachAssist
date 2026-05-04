import { Inject, Injectable, ConflictException, BadRequestException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from './invitation.entity';
import { UserService } from '../users/user.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invRepo: Repository<Invitation>,
    @Inject(forwardRef(() => UserService))
    private usersService: UserService,
  ) {}

  async add(email: string, role?: string) {
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized) throw new BadRequestException('Email invalid');
    const allowedRoles = ['student', 'professor'];
    const chosen = (role || 'student').toLowerCase().trim();
    if (!allowedRoles.includes(chosen)) throw new BadRequestException('Rol invalid');

    const registeredUser = await this.usersService.findByEmail(normalized);
    if (registeredUser) throw new ConflictException('Email deja inregistrat');

    const exists = await this.invRepo.findOne({ where: { email: normalized } });
    if (exists) throw new ConflictException('Email deja invitat');
    const inv = this.invRepo.create({ email: normalized, role: chosen as 'student' | 'professor' });
    return this.invRepo.save(inv);
  }

  // Return the invitation only if it exists and is not used
  async isInvited(email: string): Promise<Invitation | null> {
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized) return null;
    const found = await this.invRepo.findOne({ where: { email: normalized, used: false } });
    return found || null;
  }

  async use(email: string) {
    const normalized = (email || '').toLowerCase().trim();
    const found = await this.invRepo.findOne({ where: { email: normalized } });
    if (!found) return false;
    found.used = true;
    await this.invRepo.save(found);
    return true;
  }

  async delete(email: string) {
    const normalized = (email || '').toLowerCase().trim();
    const found = await this.invRepo.findOne({ where: { email: normalized } });
    if (!found) return false;
    await this.invRepo.remove(found);
    return true;
  }

  async list() {
    return this.invRepo.find();
  }
}
