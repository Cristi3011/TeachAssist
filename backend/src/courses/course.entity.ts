import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, (u) => (u as any).courses, { eager: true, onDelete: 'CASCADE' })
  professor: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
