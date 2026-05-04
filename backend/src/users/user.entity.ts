import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Course } from '../courses/course.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  username: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 20 })
  role: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Course, (c) => (c as any).professor)
  courses?: Course[];
}
