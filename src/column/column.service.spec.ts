import { Test, TestingModule } from '@nestjs/testing';
import { ColumnService } from './column.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateColumnDto, UpdateColumnDto } from './column.dto';

describe('ColumnService', () => {
  let service: ColumnService;
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
    name: 'Test Column',
    color: '#FF0000',
    position: 0,
    projectId: mockProject.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
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
        ColumnService,
        {
          provide: PrismaService,
          useValue: {
            column: {
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
            $transaction: jest.fn((callback) =>
              callback({
                column: {
                  delete: jest.fn(),
                  updateMany: jest.fn(),
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Role-based Access Control', () => {
    describe('create', () => {
      const createDto: CreateColumnDto = {
        name: 'New Column',
        color: '#00FF00',
        position: 1,
        projectId: mockProject.id,
      };

      it('should allow OWNER to create column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.column, 'create').mockResolvedValue(mockColumn);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockColumn);
      });

      it('should allow ADMIN to create column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.column, 'create').mockResolvedValue(mockColumn);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockColumn);
      });

      it('should deny MEMBER from creating column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER from creating column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('findAll', () => {
      it('should allow all roles to view columns', async () => {
        const roles = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER];
        const columns = [mockColumn];

        for (const role of roles) {
          jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
            ...mockProjectUser,
            role,
          });
          jest.spyOn(prismaService.column, 'findMany').mockResolvedValue(columns);

          const result = await service.findAll(mockUser.id, mockProject.id);
          expect(result).toEqual(columns);
        }
      });

      it('should throw NotFoundException when project access is denied', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.findAll(mockUser.id, mockProject.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('update', () => {
      const updateDto: UpdateColumnDto = {
        name: 'Updated Column',
      };

      const mockColumnWithProject = {
        ...mockColumn,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.column, 'findUnique').mockResolvedValue(mockColumnWithProject);
      });

      it('should allow OWNER to update column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.column, 'update').mockResolvedValue({
          ...mockColumn,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockColumn.id, updateDto);
        expect(result.name).toBe(updateDto.name);
      });

      it('should allow ADMIN to update column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.column, 'update').mockResolvedValue({
          ...mockColumn,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockColumn.id, updateDto);
        expect(result.name).toBe(updateDto.name);
      });

      it('should deny MEMBER from updating column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.update(mockUser.id, mockColumn.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should deny VIEWER from updating column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.update(mockUser.id, mockColumn.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('remove', () => {
      const mockColumnWithProject = {
        ...mockColumn,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.column, 'findUnique').mockResolvedValue(mockColumnWithProject);
      });

      it('should allow OWNER to delete column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.column, 'delete').mockResolvedValue(mockColumn);

        const result = await service.remove(mockUser.id, mockColumn.id);
        expect(result).toEqual({ message: 'Column deleted successfully' });
      });

      it('should allow ADMIN to delete column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.column, 'delete').mockResolvedValue(mockColumn);

        const result = await service.remove(mockUser.id, mockColumn.id);
        expect(result).toEqual({ message: 'Column deleted successfully' });
      });

      it('should deny MEMBER from deleting column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.remove(mockUser.id, mockColumn.id)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should deny VIEWER from deleting column', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.remove(mockUser.id, mockColumn.id)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw NotFoundException when column does not exist', async () => {
        jest.spyOn(prismaService.column, 'findUnique').mockResolvedValue(null);

        await expect(service.remove(mockUser.id, 999)).rejects.toThrow(NotFoundException);
      });
    });
  });
});
