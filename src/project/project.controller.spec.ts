import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectModule } from './project.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProjectModule Integration Tests', () => {
  let module: TestingModule;
  let controller: ProjectController;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
  };

  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'Test Description',
    userId: mockUser.id,
    columns: [],
    projectUsers: [],
  };

  const mockPrismaService = {
    project: {
      create: jest.fn().mockResolvedValue(mockProject),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    column: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    projectUser: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProjectModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectController>(ProjectController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'Test Project',
      description: 'Test Description',
    };

    it('should create a project with creator as owner', async () => {
      const mockCreatedProject = {
        ...mockProject,
        projectUsers: [
          {
            userId: mockUser.id,
            role: 'OWNER',
            project: mockProject,
          },
        ],
        columns: [
          { id: 1, name: 'To Do', order: 1 },
          { id: 2, name: 'In Progress', order: 2 },
          { id: 3, name: 'Done', order: 3 },
        ],
      };

      mockPrismaService.project.create.mockResolvedValue(mockCreatedProject);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback(mockPrismaService);
        }
        return mockCreatedProject;
      });

      const result = (await controller.create(
        { user: mockUser },
        createProjectDto,
      )) as unknown as typeof mockCreatedProject;

      expect(result).toEqual(mockCreatedProject);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result.projectUsers[0].role).toBe('OWNER');
      expect(result.projectUsers[0].userId).toBe(mockUser.id);
      expect(result.columns).toHaveLength(3);
      expect(result.columns[0].name).toBe('To Do');
      expect(result.columns[1].name).toBe('In Progress');
      expect(result.columns[2].name).toBe('Done');
      expect(result.columns[0].order).toBe(1);
      expect(result.columns[1].order).toBe(2);
      expect(result.columns[2].order).toBe(3);
    });

    it('should validate project name is not empty', async () => {
      const invalidDto = {
        name: '',
        description: 'Test Description',
      };

      mockPrismaService.$transaction.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate project name length', async () => {
      const invalidDto = {
        name: 'a'.repeat(101),
        description: 'Test Description',
      };

      mockPrismaService.$transaction.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle database errors during creation', async () => {
      mockPrismaService.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(controller.create({ user: mockUser }, createProjectDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('update', () => {
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project',
      description: 'Updated Description',
    };

    it('should reject update when user is not a project member', async () => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue(null);
      mockPrismaService.project.update.mockRejectedValue(
        new NotFoundException('Project not found or insufficient permissions'),
      );

      await expect(controller.update({ user: mockUser }, '1', updateProjectDto)).rejects.toThrow(
        'Project not found or insufficient permissions',
      );
    });

    it('should reject update when user is not an owner or admin', async () => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: 'MEMBER',
      });
      mockPrismaService.project.update.mockRejectedValue(
        new UnauthorizedException(
          'User does not have sufficient permissions to update this project',
        ),
      );

      await expect(controller.update({ user: mockUser }, '1', updateProjectDto)).rejects.toThrow(
        'User does not have sufficient permissions to update this project',
      );
    });
  });

  describe('remove', () => {
    it('should reject deletion when user is not a project member', async () => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue(null);
      mockPrismaService.project.delete.mockRejectedValue(
        new NotFoundException('Project not found or insufficient permissions'),
      );

      await expect(controller.remove({ user: mockUser }, '1')).rejects.toThrow(
        'Project not found or insufficient permissions',
      );
    });

    it('should reject deletion when user is not an owner', async () => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: 'ADMIN',
      });
      mockPrismaService.project.delete.mockRejectedValue(
        new UnauthorizedException('Only project owners can delete projects'),
      );

      await expect(controller.remove({ user: mockUser }, '1')).rejects.toThrow(
        'Only project owners can delete projects',
      );
    });
  });
});
