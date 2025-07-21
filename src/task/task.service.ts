import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { Role } from '../../generated/prisma';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  private async checkProjectAccess(userId: number, projectId: number) {
    const projectUser = await this.prisma.projectUser.findFirst({
      where: { userId, projectId },
    });

    if (!projectUser) {
      throw new NotFoundException('Project not found or access denied');
    }

    return projectUser;
  }

  private async checkTaskAccess(userId: number, taskId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const projectUser = await this.checkProjectAccess(userId, task.projectId);
    return { task, projectUser };
  }

  async create(userId: number, createTaskDto: CreateTaskDto) {
    const projectUser = await this.checkProjectAccess(userId, createTaskDto.projectId);

    if (projectUser.role === Role.VIEWER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const column = await this.prisma.column.findFirst({
      where: {
        id: createTaskDto.columnId,
        projectId: createTaskDto.projectId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found or does not belong to the project');
    }

    if (createTaskDto.position) {
      await this.prisma.task.updateMany({
        where: {
          columnId: createTaskDto.columnId,
          position: {
            gte: createTaskDto.position,
          },
        },
        data: {
          position: {
            increment: 1,
          },
        },
      });
    }

    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        tags: createTaskDto.tagIds
          ? {
              connect: createTaskDto.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        tags: true,
        assignedTo: true,
        column: true,
      },
    });
  }

  async findAll(userId: number, projectId: number) {
    await this.checkProjectAccess(userId, projectId);

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        tags: true,
        assignedTo: true,
        column: true,
      },
      orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
    });
  }

  async findOne(userId: number, taskId: number) {
    await this.checkTaskAccess(userId, taskId);

    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        tags: true,
        assignedTo: true,
        column: true,
      },
    });
  }

  async update(userId: number, taskId: number, updateTaskDto: UpdateTaskDto) {
    const { task, projectUser } = await this.checkTaskAccess(userId, taskId);

    if (
      projectUser.role === Role.VIEWER ||
      (projectUser.role === Role.MEMBER &&
        task.userId !== userId &&
        Object.keys(updateTaskDto).some((key) => key !== 'status'))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (updateTaskDto.columnId || updateTaskDto.position !== undefined) {
      const targetColumnId = updateTaskDto.columnId || task.columnId;

      const column = await this.prisma.column.findFirst({
        where: {
          id: targetColumnId,
          projectId: task.projectId,
        },
      });

      if (!column) {
        throw new NotFoundException('Target column not found or does not belong to the project');
      }

      if (updateTaskDto.position !== undefined) {
        await this.prisma.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: {
              gte: updateTaskDto.position,
            },
            id: { not: taskId },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateTaskDto,
        tags: updateTaskDto.tagIds
          ? {
              set: updateTaskDto.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        tags: true,
        assignedTo: true,
        column: true,
      },
    });
  }

  async remove(userId: number, taskId: number) {
    const { task, projectUser } = await this.checkTaskAccess(userId, taskId);

    if (projectUser.role !== Role.OWNER && projectUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.task.delete({ where: { id: taskId } });

    await this.prisma.task.updateMany({
      where: {
        columnId: task.columnId,
        position: {
          gt: task.position,
        },
      },
      data: {
        position: {
          decrement: 1,
        },
      },
    });

    return { message: 'Task deleted successfully' };
  }

  async findByColumn(userId: number, columnId: number) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { project: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.checkProjectAccess(userId, column.projectId);

    return this.prisma.task.findMany({
      where: { columnId },
      include: {
        tags: true,
        assignedTo: true,
        column: true,
      },
      orderBy: { position: 'asc' },
    });
  }
}
