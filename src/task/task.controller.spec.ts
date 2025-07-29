import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskModule } from './task.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role, TaskType, Priority } from '../../generated/prisma';

describe('TaskModule Integration Tests', () => {
  let module: TestingModule;
  let controller: TaskController;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
  };

  const mockProject = {
    id: 1,
    name: 'Test Project',
    userId: mockUser.id,
  };

  const mockColumn = {
    id: 1,
    name: 'To Do',
    projectId: mockProject.id,
    position: 0,
  };

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    type: TaskType.TASK,
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
    project: mockProject,
    column: mockColumn,
    tags: [],
    assignedTo: null,
  };

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
    projectUser: {
      findFirst: jest.fn(),
    },
    column: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TaskModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        {
          provide: JwtStrategy,
          useValue: {
            validate: jest.fn().mockResolvedValue(mockUser),
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<TaskController>(TaskController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Data Validation Tests', () => {
    const createDto: CreateTaskDto = {
      title: 'New Task',
      description: 'New Description',
      projectId: mockProject.id,
      columnId: mockColumn.id,
      position: 0,
    };

    beforeEach(() => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: Role.ADMIN,
      });
      mockPrismaService.column.findFirst.mockResolvedValue(mockColumn);
    });

    it('should validate required title field', async () => {
      const invalidDto = { ...createDto, title: '' };
      mockPrismaService.task.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate projectId as number', async () => {
      const invalidDto = { ...createDto, projectId: 'invalid' as any };
      mockPrismaService.task.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate columnId as number', async () => {
      const invalidDto = { ...createDto, columnId: 'invalid' as any };
      mockPrismaService.task.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate position as number', async () => {
      const invalidDto = { ...createDto, position: 'invalid' as any };
      mockPrismaService.task.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('CRUD Operations', () => {
    describe('Create', () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Description',
        projectId: mockProject.id,
        columnId: mockColumn.id,
        position: 0,
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.column.findFirst.mockResolvedValue(mockColumn);
      });

      it('should create task with valid data', async () => {
        mockPrismaService.task.create.mockResolvedValue(mockTask);

        const result = await controller.create({ user: mockUser }, createDto);
        expect(result).toEqual(mockTask);
      });

      it('should handle invalid column', async () => {
        mockPrismaService.column.findFirst.mockResolvedValue(null);

        await expect(controller.create({ user: mockUser }, createDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('Read', () => {
      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.MEMBER,
        });
      });

      it('should retrieve all tasks for a project', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        const result = await controller.findAll({ user: mockUser }, mockProject.id.toString());
        expect(result).toEqual([mockTask]);
      });

      it('should retrieve tasks by column', async () => {
        mockPrismaService.column.findUnique.mockResolvedValue(mockColumn);
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        const result = await controller.findByColumn({ user: mockUser }, mockColumn.id.toString());
        expect(result).toEqual([mockTask]);
      });

      it('should retrieve specific task', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

        const result = await controller.findOne({ user: mockUser }, mockTask.id.toString());
        expect(result).toEqual(mockTask);
      });

      it('should handle invalid project ID format', () => {
        expect(() => controller.findAll({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });

      it('should handle invalid column ID format', () => {
        expect(() => controller.findByColumn({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });

      it('should handle invalid task ID format', () => {
        expect(() => controller.findOne({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });
    });

    describe('Update', () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          project: mockProject,
        });
      });

      it('should update task', async () => {
        mockPrismaService.task.update.mockResolvedValue({
          ...mockTask,
          ...updateDto,
        });

        const result = await controller.update(
          { user: mockUser },
          mockTask.id.toString(),
          updateDto,
        );
        expect(result.title).toBe(updateDto.title);
      });

      it('should handle invalid task ID format', () => {
        expect(() => controller.update({ user: mockUser }, 'invalid-id', updateDto)).toThrow(
          BadRequestException,
        );
      });
    });

    describe('Delete', () => {
      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          project: mockProject,
        });
      });

      it('should delete task', async () => {
        mockPrismaService.task.delete.mockResolvedValue(mockTask);

        const result = await controller.remove({ user: mockUser }, mockTask.id.toString());
        expect(result).toEqual({ message: 'Task deleted successfully' });
      });

      it('should handle invalid task ID format', () => {
        expect(() => controller.remove({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: Role.ADMIN,
      });
    });

    it('should handle non-existent task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(controller.findOne({ user: mockUser }, '999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle non-existent column', async () => {
      mockPrismaService.column.findUnique.mockResolvedValue(null);

      await expect(controller.findByColumn({ user: mockUser }, '999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
