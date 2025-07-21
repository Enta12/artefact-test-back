import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, TaskType, Priority, TaskStatus } from '../../generated/prisma';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';

describe('TaskService', () => {
  let service: TaskService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockProject = {
    id: 1,
    name: 'Test Project',
  };

  const mockColumn = {
    id: 1,
    name: 'To Do',
    projectId: mockProject.id,
    position: 0,
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    type: TaskType.TASK,
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    projectId: mockProject.id,
    columnId: mockColumn.id,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    startDate: null,
    endDate: null,
    dueDate: null,
    userId: null,
  };

  const mockProjectUser = {
    id: 1,
    projectId: mockProject.id,
    userId: mockUser.id,
    role: Role.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: PrismaService,
          useValue: {
            task: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              updateMany: jest.fn(),
            },
            projectUser: {
              findFirst: jest.fn(),
            },
            column: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Role-based Access Control', () => {
    describe('create', () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Description',
        projectId: mockProject.id,
        columnId: mockColumn.id,
        position: 0,
      };

      it('should allow OWNER to create task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.column, 'findFirst').mockResolvedValue(mockColumn);
        jest.spyOn(prismaService.task, 'create').mockResolvedValue(mockTask);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockTask);
      });

      it('should allow ADMIN to create task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.column, 'findFirst').mockResolvedValue(mockColumn);
        jest.spyOn(prismaService.task, 'create').mockResolvedValue(mockTask);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockTask);
      });

      it('should allow MEMBER to create task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });
        jest.spyOn(prismaService.column, 'findFirst').mockResolvedValue(mockColumn);
        jest.spyOn(prismaService.task, 'create').mockResolvedValue(mockTask);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockTask);
      });

      it('should deny VIEWER from creating task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });

      it('should handle invalid column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.column, 'findFirst').mockResolvedValue(null);

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      const mockTaskWithProject = {
        ...mockTask,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.task, 'findUnique').mockResolvedValue(mockTaskWithProject);
      });

      it('should allow OWNER to update task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.task, 'update').mockResolvedValue({
          ...mockTask,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockTask.id, updateDto);
        expect(result.title).toBe(updateDto.title);
      });

      it('should allow ADMIN to update task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.task, 'update').mockResolvedValue({
          ...mockTask,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockTask.id, updateDto);
        expect(result.title).toBe(updateDto.title);
      });

      it('should allow MEMBER to update task status', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });
        jest.spyOn(prismaService.task, 'update').mockResolvedValue({
          ...mockTask,
          status: TaskStatus.IN_PROGRESS,
        });

        const result = await service.update(mockUser.id, mockTask.id, {
          status: TaskStatus.IN_PROGRESS,
        });
        expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      });

      it('should deny MEMBER from updating non-status fields of non-assigned task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(
          service.update(mockUser.id, mockTask.id, { title: 'New Title' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER from updating task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.update(mockUser.id, mockTask.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('remove', () => {
      const mockTaskWithProject = {
        ...mockTask,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.task, 'findUnique').mockResolvedValue(mockTaskWithProject);
      });

      it('should allow OWNER to delete task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.task, 'delete').mockResolvedValue(mockTask);

        const result = await service.remove(mockUser.id, mockTask.id);
        expect(result).toEqual({ message: 'Task deleted successfully' });
      });

      it('should allow ADMIN to delete task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.task, 'delete').mockResolvedValue(mockTask);

        const result = await service.remove(mockUser.id, mockTask.id);
        expect(result).toEqual({ message: 'Task deleted successfully' });
      });

      it('should deny MEMBER from deleting task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.remove(mockUser.id, mockTask.id)).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER from deleting task', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.remove(mockUser.id, mockTask.id)).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        jest.spyOn(prismaService.task, 'findUnique').mockResolvedValue(null);

        await expect(service.remove(mockUser.id, 999)).rejects.toThrow(NotFoundException);
      });
    });
  });
});
