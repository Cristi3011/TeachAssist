import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Course } from '../courses/course.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 180 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 20, default: 'assignment' })
  kind!: 'assignment' | 'material';

  @Column({ type: 'timestamptz', nullable: true })
  due_at!: Date | null;

  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course!: Course;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
