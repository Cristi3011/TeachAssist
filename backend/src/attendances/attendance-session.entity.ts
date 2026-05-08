import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Course } from '../courses/course.entity';
import { User } from '../users/user.entity';

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 128, unique: true })
  token: string;

  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course: Course;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL', nullable: true })
  createdBy?: User;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ type: 'int', nullable: true })
  maxUses?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
