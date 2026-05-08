import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Course } from '../courses/course.entity';

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  
  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ length: 30, nullable: true })
  group?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime?: Date;

  @Column({ length: 128, unique: true, nullable: true })
  qrToken?: string;

  @Column({ type: 'enum', enum: ['scheduled', 'active', 'closed'], default: 'scheduled' })
  status: 'scheduled' | 'active' | 'closed';
}
