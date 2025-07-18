import { Test, TestingModule } from '@nestjs/testing';
import { ColumnController } from './column.controller';
import { ColumnModule } from './column.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateColumnDto, UpdateColumnDto } from './column.dto';
import { BadRequestException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role } from '../../generated/prisma';

describe('ColumnModule Integration Tests', () => {
  let module: TestingModule;
  let controller: ColumnController;

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
    name: 'Test Column',
    color: '#FF0000',
    position: 0,
    projectId: mockProject.id,
    project: mockProject,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  const mockPrismaService = {
    column: {
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
    task: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ColumnModule,
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

    controller = module.get<ColumnController>(ColumnController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Data Validation Tests', () => {
    const createDto: CreateColumnDto = {
      name: 'New Column',
      color: '#00FF00',
      position: 1,
      projectId: mockProject.id,
    };

    beforeEach(() => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: Role.ADMIN,
      });
    });

    it('should validate required name field', async () => {
      const invalidDto = { ...createDto, name: '' };
      mockPrismaService.column.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate optional color field format', async () => {
      const invalidDto = { ...createDto, color: 'invalid-color' };
      mockPrismaService.column.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate position as positive integer', async () => {
      const invalidDto = { ...createDto, position: -1 };
      mockPrismaService.column.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('CRUD Operations', () => {
    describe('Create', () => {
      const createDto: CreateColumnDto = {
        name: 'New Column',
        color: '#00FF00',
        position: 1,
        projectId: mockProject.id,
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
      });

      it('should create column with valid data', async () => {
        mockPrismaService.column.create.mockResolvedValue(mockColumn);

        const result = await controller.create({ user: mockUser }, createDto);
        expect(result).toEqual(mockColumn);
      });

      it('should create column without color', async () => {
        const dtoWithoutColor = { ...createDto };
        delete dtoWithoutColor.color;

        mockPrismaService.column.create.mockResolvedValue({ ...mockColumn, color: null });

        const result = await controller.create({ user: mockUser }, dtoWithoutColor);
        expect(result.color).toBeNull();
      });
    });

    describe('Read', () => {
      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.MEMBER,
        });
      });

      it('should retrieve all columns for a project', async () => {
        mockPrismaService.column.findMany.mockResolvedValue([mockColumn]);

        const result = await controller.findAll({ user: mockUser }, mockProject.id.toString());
        expect(result).toEqual([mockColumn]);
      });

      it('should retrieve specific column', async () => {
        mockPrismaService.column.findFirst.mockResolvedValue({
          ...mockColumn,
          project: {
            id: mockProject.id,
          },
        });

        const result = await controller.findOne({ user: mockUser }, mockColumn.id.toString());
        expect(result).toEqual({
          ...mockColumn,
          project: {
            id: mockProject.id,
          },
        });
      });
    });

    describe('Update', () => {
      const updateDto: UpdateColumnDto = {
        name: 'Updated Column',
        color: '#0000FF',
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.column.findUnique.mockResolvedValue({
          ...mockColumn,
          project: {
            id: mockProject.id,
          },
        });
      });

      it('should update column name', async () => {
        mockPrismaService.column.update.mockResolvedValue({
          ...mockColumn,
          name: updateDto.name,
        });

        const result = await controller.update({ user: mockUser }, mockColumn.id.toString(), {
          name: updateDto.name,
        });
        expect(result.name).toBe(updateDto.name);
      });

      it('should update column position', async () => {
        const newPosition = 2;
        mockPrismaService.column.findMany.mockResolvedValue([
          mockColumn,
          { ...mockColumn, id: 2, position: 1 },
          { ...mockColumn, id: 3, position: 2 },
        ]);

        mockPrismaService.column.update.mockResolvedValue({
          ...mockColumn,
          position: newPosition,
        });

        const result = await controller.update({ user: mockUser }, mockColumn.id.toString(), {
          position: newPosition,
        });
        expect(result.position).toBe(newPosition);
      });
    });

    describe('Delete', () => {
      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.column.findUnique.mockResolvedValue({
          ...mockColumn,
          project: {
            id: mockProject.id,
          },
        });
      });

      it('should delete column', async () => {
        mockPrismaService.column.delete.mockResolvedValue(mockColumn);

        const result = await controller.remove({ user: mockUser }, mockColumn.id.toString());
        expect(result).toEqual({ message: 'Column deleted successfully' });
      });

      it('should reorder remaining columns after deletion', async () => {
        await controller.remove({ user: mockUser }, mockColumn.id.toString());
        expect(mockPrismaService.column.updateMany).toHaveBeenCalledWith({
          where: {
            projectId: mockColumn.projectId,
            position: { gt: mockColumn.position },
          },
          data: {
            position: { decrement: 1 },
          },
        });
      });
    });
  });

  describe('Position Management', () => {
    beforeEach(() => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: Role.ADMIN,
      });
    });

    it('should handle automatic position arrangement on insert', async () => {
      const createDto: CreateColumnDto = {
        name: 'New Column',
        projectId: mockProject.id,
      };

      mockPrismaService.column.findFirst.mockResolvedValue(mockColumn);
      mockPrismaService.column.create.mockResolvedValue({
        ...mockColumn,
        position: mockColumn.position + 1,
      });

      const result = await controller.create({ user: mockUser }, createDto);
      expect(result.position).toBe(mockColumn.position + 1);
    });

    it('should validate duplicate positions', async () => {
      const updateDto: UpdateColumnDto = {
        position: 1,
      };

      mockPrismaService.column.findUnique.mockResolvedValue({
        ...mockColumn,
        project: {
          id: mockProject.id,
        },
      });
      mockPrismaService.column.update.mockRejectedValue(new BadRequestException());

      await expect(
        controller.update({ user: mockUser }, mockColumn.id.toString(), updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockPrismaService.projectUser.findFirst.mockResolvedValue({
        userId: mockUser.id,
        role: Role.ADMIN,
      });
    });

    it('should handle invalid position values', async () => {
      const updateDto: UpdateColumnDto = {
        position: -1,
      };

      mockPrismaService.column.findUnique.mockResolvedValue({
        ...mockColumn,
        project: {
          id: mockProject.id,
        },
      });
      mockPrismaService.column.update.mockRejectedValue(new BadRequestException());

      await expect(
        controller.update({ user: mockUser }, mockColumn.id.toString(), updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
