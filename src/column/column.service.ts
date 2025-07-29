import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto, UpdateColumnDto } from './column.dto';
import { Role } from '../../generated/prisma';

@Injectable()
export class ColumnService {
  constructor(private prisma: PrismaService) {}

  private async checkUserAccess(userId: number, projectId: number, requiredRoles: Role[]) {
    const projectAccess = await this.prisma.projectUser.findFirst({
      where: {
        userId,
        projectId,
      },
    });

    if (!projectAccess) {
      throw new NotFoundException('Project not found or access denied');
    }

    if (!requiredRoles.includes(projectAccess.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return projectAccess;
  }

  async create(userId: number, createColumnDto: CreateColumnDto) {
    await this.checkUserAccess(userId, createColumnDto.projectId, [Role.OWNER, Role.ADMIN]);

    if (!createColumnDto.position) {
      const lastColumn = await this.prisma.column.findFirst({
        where: { projectId: createColumnDto.projectId },
        orderBy: { position: 'desc' },
      });
      createColumnDto.position = lastColumn ? lastColumn.position + 1 : 0;
    }

    await this.shiftColumnsForInsertion(createColumnDto.projectId, createColumnDto.position);

    return this.prisma.column.create({
      data: {
        name: createColumnDto.name,
        color: createColumnDto.color,
        position: createColumnDto.position,
        projectId: createColumnDto.projectId,
      },
      include: {
        tasks: true,
      },
    });
  }

  async findAll(userId: number, projectId: number) {
    await this.checkUserAccess(userId, projectId, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
      Role.VIEWER,
    ]);

    return this.prisma.column.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
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
    });
  }

  async findOne(userId: number, id: number) {
    const column = await this.prisma.column.findFirst({
      where: {
        id,
        project: {
          projectUsers: {
            some: { userId },
          },
        },
      },
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
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found or access denied`);
    }

    await this.checkUserAccess(userId, column.project.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
      Role.VIEWER,
    ]);

    return column;
  }

  async update(userId: number, id: number, updateColumnDto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    await this.checkUserAccess(userId, column.project.id, [Role.OWNER, Role.ADMIN]);

    if (updateColumnDto.position !== undefined) {
      await this.handlePositionUpdate(column.project.id, id, updateColumnDto.position);
    }

    const { position: _, ...otherUpdates } = updateColumnDto;
    const dataToUpdate = updateColumnDto.position !== undefined ? otherUpdates : updateColumnDto;

    if (Object.keys(dataToUpdate).length === 0) {
      return this.prisma.column.findUnique({
        where: { id },
        include: {
          tasks: true,
        },
      });
    }

    return this.prisma.column.update({
      where: { id },
      data: dataToUpdate,
      include: {
        tasks: true,
      },
    });
  }

  async remove(userId: number, id: number) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    await this.checkUserAccess(userId, column.project.id, [Role.OWNER, Role.ADMIN]);

    await this.prisma.$transaction(async (tx) => {
      await tx.column.delete({ where: { id } });
      const remainingColumns = await tx.column.findMany({
        where: { projectId: column.project.id },
        orderBy: { position: 'asc' },
      });
      for (let i = 0; i < remainingColumns.length; i++) {
        if (remainingColumns[i].position !== i) {
          await tx.column.update({
            where: { id: remainingColumns[i].id },
            data: { position: -1 - i },
          });
        }
      }
      for (let i = 0; i < remainingColumns.length; i++) {
        await tx.column.update({
          where: { id: remainingColumns[i].id },
          data: { position: i },
        });
      }
    });

    return { message: 'Column deleted successfully' };
  }

  private async shiftColumnsForInsertion(projectId: number, position: number) {
    await this.prisma.column.updateMany({
      where: {
        projectId,
        position: { gte: position },
      },
      data: {
        position: { increment: 1 },
      },
    });
  }

  private async handlePositionUpdate(projectId: number, columnId: number, newPosition: number) {
    const columns = await this.prisma.column.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });

    if (newPosition < 0 || newPosition >= columns.length) {
      throw new BadRequestException('Invalid position');
    }

    const currentColumn = columns.find((c) => c.id === columnId);
    if (!currentColumn) return;

    const oldPosition = currentColumn.position;
    if (oldPosition === newPosition) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.column.update({
        where: { id: columnId },
        data: { position: -1 },
      });

      if (oldPosition < newPosition) {
        await tx.column.updateMany({
          where: {
            projectId,
            position: {
              gt: oldPosition,
              lte: newPosition,
            },
            id: { not: columnId },
          },
          data: {
            position: { decrement: 1 },
          },
        });
      } else {
        await tx.column.updateMany({
          where: {
            projectId,
            position: {
              gte: newPosition,
              lt: oldPosition,
            },
            id: { not: columnId },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }

      await tx.column.update({
        where: { id: columnId },
        data: { position: newPosition },
      });
    });
  }
}
