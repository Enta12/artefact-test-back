import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { Role } from '../../generated/prisma';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  private async checkProjectAccess(userId: number, projectId: number) {
    const projectUser = await this.prisma.projectUser.findFirst({
      where: {
        userId,
        projectId,
      },
    });

    if (!projectUser) {
      throw new NotFoundException('Project not found');
    }

    return projectUser;
  }

  private async checkTagAccess(userId: number, tagId: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
      include: { project: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const projectUser = await this.checkProjectAccess(userId, tag.projectId);
    return { tag, projectUser };
  }

  async create(userId: number, createTagDto: CreateTagDto) {
    const projectUser = await this.checkProjectAccess(userId, createTagDto.projectId);

    if (projectUser.role !== Role.OWNER && projectUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const existingTag = await this.prisma.tag.findFirst({
      where: {
        projectId: createTagDto.projectId,
        name: createTagDto.name,
      },
    });

    if (existingTag) {
      throw new ForbiddenException('A tag with this name already exists in the project');
    }

    return this.prisma.tag.create({
      data: createTagDto,
    });
  }

  async findAll(userId: number, projectId: number) {
    await this.checkProjectAccess(userId, projectId);

    return this.prisma.tag.findMany({
      where: {
        projectId,
      },
      include: {
        tasks: true,
      },
    });
  }

  async findOne(userId: number, tagId: number) {
    const { tag } = await this.checkTagAccess(userId, tagId);
    return tag;
  }

  async update(userId: number, tagId: number, updateTagDto: UpdateTagDto) {
    const { tag, projectUser } = await this.checkTagAccess(userId, tagId);

    if (projectUser.role !== Role.OWNER && projectUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (updateTagDto.name) {
      const existingTag = await this.prisma.tag.findFirst({
        where: {
          projectId: tag.projectId,
          name: updateTagDto.name,
          id: { not: tagId },
        },
      });

      if (existingTag) {
        throw new ForbiddenException('A tag with this name already exists in the project');
      }
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: updateTagDto,
    });
  }

  async remove(userId: number, tagId: number) {
    const { projectUser } = await this.checkTagAccess(userId, tagId);

    if (projectUser.role !== Role.OWNER && projectUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.tag.delete({
      where: { id: tagId },
    });

    return { message: 'Tag deleted successfully' };
  }
}
