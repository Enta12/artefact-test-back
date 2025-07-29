//TODO MAKE THIS
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectMemberService } from './project-member.service';
import { Role } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/members')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  @Get()
  async listMembers(@Request() req, @Param('projectId', ParseIntPipe) projectId: number) {
    // TODO: vérifier que req.user a accès au projet (sinon 404)
    return this.projectMemberService.listMembers(projectId);
  }

  @Post()
  async addMember(
    @Request() req,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: { userId?: number; email?: string; role?: Role },
  ) {
    // TODO: vérifier que req.user a accès au projet (sinon 404)
    return this.projectMemberService.addMember(projectId, body.userId, body.role, body.email);
  }

  @Patch(':userId')
  async updateMemberRole(
    @Request() req,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { role: Role },
  ) {
    // TODO: vérifier que req.user a accès au projet (sinon 404)
    return this.projectMemberService.updateMemberRole(projectId, userId, body.role);
  }

  @Delete(':userId')
  async removeMember(
    @Request() req,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    // TODO: vérifier que req.user a accès au projet (sinon 404)
    return this.projectMemberService.removeMember(projectId, userId);
  }
}
