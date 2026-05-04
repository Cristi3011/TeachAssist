import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Announcement } from './announcement.entity';

@Entity('announcement_comments')
export class AnnouncementComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  authorName!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => Announcement, (a) => a.comments, { onDelete: 'CASCADE' })
  announcement!: Announcement;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
