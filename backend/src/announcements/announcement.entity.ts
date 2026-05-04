import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Course } from '../courses/course.entity';
import { AnnouncementComment } from './announcement-comment.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course!: Course;

  @OneToMany(() => AnnouncementComment, (comment) => comment.announcement, { cascade: false })
  comments!: AnnouncementComment[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
