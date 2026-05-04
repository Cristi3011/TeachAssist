import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: ['student', 'professor'], default: 'student' })
  role: 'student' | 'professor';
  @Column({ default: false })
  used: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
