import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';
import { UserService } from '../users/user.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    private userService: UserService,
  ) {}

  async create(title: string, description: string, professorEmail: string) {
    const email = (professorEmail || '').toLowerCase().trim();
    if (!email) throw new BadRequestException('Professor email required');
    const prof = await this.userService.findByEmail(email);
    if (!prof) throw new NotFoundException('Professor not found');
    if ((prof as any).role?.toLowerCase() !== 'professor') throw new ForbiddenException('User is not a professor');

    const course = this.courseRepo.create({ title, description, professor: prof });
    return this.courseRepo.save(course);
  }

  async listAll(take?: number) {
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .leftJoin('c.professor', 'p')
      .select(['c.id', 'c.title', 'c.description', 'c.created_at', 'p.email', 'p.username']);
    qb.orderBy('c.created_at', 'DESC');
    if (typeof take === 'number' && take > 0) qb.take(take);
    return qb.getMany();
  }

  async listByProfessorEmail(email: string, take?: number) {
    const e = (email || '').toLowerCase().trim();
    if (!e) return [];
    const prof = await this.userService.findByEmail(e);
    if (!prof) return [];
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .leftJoin('c.professor', 'p')
      .select(['c.id', 'c.title', 'c.description', 'c.created_at', 'p.email', 'p.username'])
      .where('p.id = :pid', { pid: (prof as any).id })
      .orderBy('c.created_at', 'DESC');
    if (typeof take === 'number' && take > 0) qb.take(take);
    return qb.getMany();
  }

  async getById(id: number) {
    if (!id) return null;
    return this.courseRepo.findOne({
      where: { id } as any,
      relations: ['professor'],
    });
  }

  async update(id: number, title: string, description: string) {
    const course = await this.getById(id);
    if (!course) throw new NotFoundException('Course not found');

    const cleanTitle = (title || '').trim();
    if (!cleanTitle) throw new BadRequestException('Course title required');

    course.title = cleanTitle;
    course.description = (description || '').trim();
    return this.courseRepo.save(course);
  }

  async remove(id: number) {
    const res = await this.courseRepo.delete(id);
    // Some drivers/TypeORM versions may return undefined/null for `affected`.
    // Prefer a safe check and fallback to an existence check + remove.
    const affected = (res && typeof (res as any).affected === 'number') ? (res as any).affected : undefined;
    if (typeof affected === 'number') return affected > 0;

    // Fallback: check if course exists and remove it
    const found = await this.courseRepo.findOne({ where: { id } as any });
    if (!found) return false;
    await this.courseRepo.remove(found);
    return true;
  }
}
