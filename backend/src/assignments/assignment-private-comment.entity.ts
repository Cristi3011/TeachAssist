import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Assignment } from './assignment.entity';

@Entity('assignment_private_comments')
export class AssignmentPrivateComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  studentEmail!: string;

  @Column({ length: 140 })
  authorName!: string;

  @Column({ length: 30 })
  authorRole!: 'student' | 'professor';

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => Assignment, { eager: true, onDelete: 'CASCADE' })
  assignment!: Assignment;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
