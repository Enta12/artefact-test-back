import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectMemberService } from './project-member.service';
import { ProjectMemberController } from './project-member.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController, ProjectMemberController],
  providers: [ProjectService, ProjectMemberService],
  exports: [ProjectService],
})
export class ProjectModule {}
