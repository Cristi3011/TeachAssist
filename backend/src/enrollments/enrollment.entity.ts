import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Course } from '../courses/course.entity';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  studentEmail: string;

  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'], default: 'pending' })
  status: 'pending' | 'accepted' | 'declined';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
