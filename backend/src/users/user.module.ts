import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => InvitationsModule)], 
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
