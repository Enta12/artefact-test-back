import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagModule } from './tag.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role } from '../../generated/prisma';

describe('TagModule Integration Tests', () => {
  let module: TestingModule;
  let controller: TagController;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
  };

  const mockProject = {
    id: 1,
    name: 'Test Project',
    userId: mockUser.id,
  };

  const mockTag = {
    id: 1,
    name: 'Important',
    color: '#FF0000',
    projectId: mockProject.id,
    project: mockProject,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  const mockPrismaService = {
    tag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
    projectUser: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TagModule,
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

    controller = module.get<TagController>(TagController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Data Validation Tests', () => {
    const createDto: CreateTagDto = {
      name: 'New Tag',
      color: '#00FF00',
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
      mockPrismaService.tag.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate color field format', async () => {
      const invalidDto = { ...createDto, color: 'invalid-color' };
      mockPrismaService.tag.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate projectId as number', async () => {
      const invalidDto = { ...createDto, projectId: 'invalid' as any };
      mockPrismaService.tag.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ user: mockUser }, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('CRUD Operations', () => {
    describe('Create', () => {
      const createDto: CreateTagDto = {
        name: 'New Tag',
        color: '#00FF00',
        projectId: mockProject.id,
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
      });

      it('should create tag with valid data', async () => {
        mockPrismaService.tag.create.mockResolvedValue(mockTag);

        const result = await controller.create({ user: mockUser }, createDto);
        expect(result).toEqual(mockTag);
      });

      it('should handle duplicate tag names', async () => {
        mockPrismaService.tag.findFirst.mockResolvedValue(mockTag);

        await expect(controller.create({ user: mockUser }, createDto)).rejects.toThrow(
          ForbiddenException,
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

      it('should retrieve all tags for a project', async () => {
        mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);

        const result = await controller.findAll({ user: mockUser }, mockProject.id.toString());
        expect(result).toEqual([mockTag]);
      });

      it('should retrieve specific tag', async () => {
        mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

        const result = await controller.findOne({ user: mockUser }, mockTag.id.toString());
        expect(result).toEqual(mockTag);
      });

      it('should handle invalid project ID format', () => {
        expect(() => controller.findAll({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });

      it('should handle invalid tag ID format', () => {
        expect(() => controller.findOne({ user: mockUser }, 'invalid-id')).toThrow(
          BadRequestException,
        );
      });
    });

    describe('Update', () => {
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
        color: '#0000FF',
      };

      beforeEach(() => {
        mockPrismaService.projectUser.findFirst.mockResolvedValue({
          userId: mockUser.id,
          role: Role.ADMIN,
        });
        mockPrismaService.tag.findUnique.mockResolvedValue({
          ...mockTag,
          project: {
            id: mockProject.id,
          },
        });
      });

      it('should update tag name', async () => {
        mockPrismaService.tag.findFirst.mockResolvedValue(null);
        mockPrismaService.tag.update.mockResolvedValue({
          ...mockTag,
          name: updateDto.name,
        });

        const result = await controller.update({ user: mockUser }, mockTag.id.toString(), {
          name: updateDto.name,
        });
        expect(result.name).toBe(updateDto.name);
      });

      it('should update tag color', async () => {
        mockPrismaService.tag.update.mockResolvedValue({
          ...mockTag,
          color: updateDto.color,
        });

        const result = await controller.update({ user: mockUser }, mockTag.id.toString(), {
          color: updateDto.color,
        });
        expect(result.color).toBe(updateDto.color);
      });

      it('should handle invalid tag ID format', () => {
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
        mockPrismaService.tag.findUnique.mockResolvedValue({
          ...mockTag,
          project: {
            id: mockProject.id,
          },
        });
      });

      it('should delete tag', async () => {
        mockPrismaService.tag.delete.mockResolvedValue(mockTag);

        const result = await controller.remove({ user: mockUser }, mockTag.id.toString());
        expect(result).toEqual({ message: 'Tag deleted successfully' });
      });

      it('should handle invalid tag ID format', () => {
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

    it('should handle invalid tag ID format', () => {
      expect(() => controller.findOne({ user: mockUser }, 'invalid-id')).toThrow(
        BadRequestException,
      );
    });

    it('should handle non-existent tag', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(controller.findOne({ user: mockUser }, '999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
