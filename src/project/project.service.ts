import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { Role } from '../../generated/prisma';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createProjectDto: CreateProjectDto) {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          ...createProjectDto,
          projectUsers: {
            create: {
              userId,
              role: Role.OWNER,
            },
          },
        },
        include: {
          projectUsers: true,
        },
      });

      await tx.column.create({
        data: {
          name: 'To Do',
          position: 0,
          projectId: project.id,
        },
      });

      return project;
    });
  }

  async findAllForUser(userId: number) {
    return await this.prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId,
          },
        },
      },
      include: {
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        columns: {
          include: {
            tasks: true,
          },
        },
        tags: true,
      },
    });
  }

  async findOne(id: number, userId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        projectUsers: {
          some: {
            userId,
          },
        },
      },
      include: {
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        columns: {
          include: {
            tasks: {
              include: {
                tags: true,
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        tags: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found or access denied`);
    }

    return project;
  }

  async update(id: number, userId: number, updateProjectDto: UpdateProjectDto) {
    const projectUser = await this.prisma.projectUser.findFirst({
      where: {
        projectId: id,
        userId,
        role: {
          in: [Role.OWNER, Role.ADMIN],
        },
      },
    });

    if (!projectUser) {
      throw new NotFoundException('Project not found or insufficient permissions');
    }

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: number, userId: number) {
    const projectUser = await this.prisma.projectUser.findFirst({
      where: {
        projectId: id,
        userId,
        role: Role.OWNER,
      },
    });

    if (!projectUser) {
      throw new NotFoundException('Project not found or insufficient permissions');
    }

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
