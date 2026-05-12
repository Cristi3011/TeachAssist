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

  @Column({ type: 'varchar', length: 400, nullable: true })
  resource_url?: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  resource_original_name?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  resource_mime?: string | null;
  
  @Column({ type: 'varchar', length: 200, nullable: true })
  resource_stored_name?: string | null;
  
  @Column({ type: 'int', nullable: false, default: 100 })
  max_points!: number;

}
