import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './users/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'teachassist',
      password: 'Assistteachers',
      database: 'teachassist',
      autoLoadEntities: true,  
      synchronize: true,
    }),
    UserModule,
  ],
})
export class AppModule {}
