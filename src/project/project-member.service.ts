//TODO MAKE THIS
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma';

@Injectable()
export class ProjectMemberService {
  constructor(private prisma: PrismaService) {}

  async listMembers(projectId: number) {
    return this.prisma.projectUser.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async addMember(projectId: number, userId?: number, role?: Role, email?: string) {
    let finalUserId = userId;
    if (!finalUserId && email) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new NotFoundException('User with this email not found');
      }
      finalUserId = user.id;
    }
    if (!finalUserId) {
      throw new NotFoundException('UserId or email must be provided');
    }
    const existing = await this.prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId: finalUserId } },
    });
    if (existing) {
      throw new ForbiddenException('User is already a member of this project');
    }
    return this.prisma.projectUser.create({
      data: { projectId, userId: finalUserId, role: role || Role.MEMBER },
    });
  }

  async updateMemberRole(projectId: number, userId: number, role: Role) {
    const member = await this.prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return this.prisma.projectUser.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
    });
  }

  async removeMember(projectId: number, userId: number) {
    const member = await this.prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return this.prisma.projectUser.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
