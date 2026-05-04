import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from './invitation.entity';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation]), forwardRef(() => UserModule)],
  providers: [InvitationsService],
  controllers: [InvitationsController],
  exports: [InvitationsService],
})
export class InvitationsModule {}
