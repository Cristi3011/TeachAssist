import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { AttendanceSession } from './attendance-session.entity';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AttendanceSession, { eager: true, onDelete: 'CASCADE' })
  session: AttendanceSession;

  @Column({ length: 150 })
  studentEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
