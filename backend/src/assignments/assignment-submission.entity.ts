import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Assignment } from './assignment.entity';

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  studentEmail!: string;

  @Column({ length: 260 })
  originalFileName!: string;

  @Column({ length: 320 })
  storedFileName!: string;

  @Column({ length: 200 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;

  @ManyToOne(() => Assignment, { eager: true, onDelete: 'CASCADE' })
  assignment!: Assignment;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
