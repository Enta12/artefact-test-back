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
    let projectUser;
    try {
      projectUser = await this.checkProjectAccess(userId, createTaskDto.projectId);
    } catch (e) {
      console.error('Error checkProjectAccess:', e);
      throw e;
    }

    if (projectUser.role === Role.VIEWER) {
      console.warn('Denied: VIEWER role');
      throw new ForbiddenException('Insufficient permissions');
    }

    let column;
    try {
      column = await this.prisma.column.findFirst({
        where: {
          id: createTaskDto.columnId,
          projectId: createTaskDto.projectId,
        },
      });
    } catch (e) {
      console.error('Error searching column:', e);
      throw e;
    }

    if (!column) {
      console.warn('Column not found or does not belong to the project');
      throw new NotFoundException('Column not found or does not belong to the project');
    }

    if (createTaskDto.position) {
      try {
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
      } catch (e) {
        console.error('Error updateMany positions:', e);
        throw e;
      }
    }

    const { tagIds, ...taskData } = createTaskDto;

    try {
      const createdTask = await this.prisma.task.create({
        data: {
          ...taskData,
          tags: tagIds
            ? {
                connect: tagIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          tags: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          column: true,
        },
      });
      return createdTask;
    } catch (e) {
      console.error('Error creating task:', e);
      throw e;
    }
  }

  async findAll(userId: number, projectId: number) {
    await this.checkProjectAccess(userId, projectId);

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        tags: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: true,
      },
    });
  }

  async update(userId: number, taskId: number, updateTaskDto: UpdateTaskDto) {
    const { task, projectUser } = await this.checkTaskAccess(userId, taskId);

    if (
      projectUser.role === Role.VIEWER ||
      (projectUser.role === Role.MEMBER && task.userId !== userId)
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
        return await this.prisma.$transaction(async (tx) => {
          const currentTask = await tx.task.findUnique({
            where: { id: taskId },
            select: { position: true, columnId: true },
          });

          if (!currentTask) {
            throw new Error('Task not found');
          }

          const targetPosition = updateTaskDto.position!;

          if (targetColumnId !== currentTask.columnId) {
            const tasksInOldColumn = await tx.task.findMany({
              where: { columnId: currentTask.columnId },
              select: { id: true, position: true, title: true },
              orderBy: { position: 'asc' },
            });

            const tasksInNewColumn = await tx.task.findMany({
              where: { columnId: targetColumnId },
              select: { id: true, position: true, title: true },
              orderBy: { position: 'asc' },
            });

            await tx.task.update({
              where: { id: taskId },
              data: { position: -1 },
            });

            const tasksToUpdateInOldColumn = tasksInOldColumn.filter(
              (t) => t.position > currentTask.position,
            );

            for (const task of tasksToUpdateInOldColumn) {
              await tx.task.update({
                where: { id: task.id },
                data: { position: task.position - 1 },
              });
            }

            const tasksToUpdateInNewColumn = tasksInNewColumn.filter(
              (t) => t.position >= targetPosition,
            );

            for (let i = tasksToUpdateInNewColumn.length - 1; i >= 0; i--) {
              const task = tasksToUpdateInNewColumn[i];
              await tx.task.update({
                where: { id: task.id },
                data: { position: task.position + 1 },
              });
            }

            const { tagIds, ...taskUpdateData } = updateTaskDto;

            const updatedTask = await tx.task.update({
              where: { id: taskId },
              data: {
                ...taskUpdateData,
                columnId: targetColumnId,
                position: targetPosition,
                tags: tagIds
                  ? {
                      set: tagIds.map((id) => ({ id })),
                    }
                  : undefined,
              },
              include: {
                tags: true,
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                column: true,
              },
            });
            return updatedTask;
          }

          if (targetPosition !== currentTask.position) {
            const allTasksInColumn = await tx.task.findMany({
              where: { columnId: targetColumnId },
              select: { id: true, position: true, title: true },
              orderBy: { position: 'asc' },
            });

            for (let i = 0; i < allTasksInColumn.length; i++) {
              await tx.task.update({
                where: { id: allTasksInColumn[i].id },
                data: { position: -(i + 1) },
              });
            }

            const tasksExceptCurrent = allTasksInColumn.filter((t) => t.id !== taskId);
            const newOrder = [...tasksExceptCurrent];

            newOrder.splice(targetPosition, 0, allTasksInColumn.find((t) => t.id === taskId)!);

            for (let i = 0; i < newOrder.length; i++) {
              await tx.task.update({
                where: { id: newOrder[i].id },
                data: { position: i },
              });
            }

            const { tagIds: tagIdsFromUpdate, ...taskUpdateData } = updateTaskDto;

            const updatedTask = await tx.task.update({
              where: { id: taskId },
              data: {
                ...taskUpdateData,
                position: targetPosition,
                tags: tagIdsFromUpdate
                  ? {
                      set: tagIdsFromUpdate.map((id) => ({ id })),
                    }
                  : undefined,
              },
              include: {
                tags: true,
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                column: true,
              },
            });

            await tx.task.findMany({
              where: { columnId: targetColumnId },
              select: { id: true, position: true, title: true },
              orderBy: { position: 'asc' },
            });

            return updatedTask;
          }

          const { tagIds: tagIdsNoPosition, ...taskUpdateData } = updateTaskDto;

          const updatedTask = await tx.task.update({
            where: { id: taskId },
            data: {
              ...taskUpdateData,
              tags: tagIdsNoPosition
                ? {
                    set: tagIdsNoPosition.map((id) => ({ id })),
                  }
                : undefined,
            },
            include: {
              tags: true,
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              column: true,
            },
          });

          return updatedTask;
        });
      }
    }

    const { tagIds, ...updateData } = updateTaskDto;

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        tags: tagIds
          ? {
              set: tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        tags: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: true,
      },
      orderBy: { position: 'asc' },
    });
  }
}
