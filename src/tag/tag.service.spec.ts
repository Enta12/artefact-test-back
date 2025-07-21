import { Test, TestingModule } from '@nestjs/testing';
import { TagService } from './tag.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTagDto, UpdateTagDto } from './tag.dto';

describe('TagService', () => {
  let service: TagService;
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

  const mockTag = {
    id: 1,
    name: 'Important',
    color: '#FF0000',
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
        TagService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            projectUser: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Role-based Access Control', () => {
    describe('create', () => {
      const createDto: CreateTagDto = {
        name: 'New Tag',
        color: '#00FF00',
        projectId: mockProject.id,
      };

      it('should allow OWNER to create tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.tag, 'create').mockResolvedValue(mockTag);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockTag);
      });

      it('should allow ADMIN to create tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.tag, 'create').mockResolvedValue(mockTag);

        const result = await service.create(mockUser.id, createDto);
        expect(result).toEqual(mockTag);
      });

      it('should deny MEMBER from creating tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER from creating tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });

      it('should prevent duplicate tag names in same project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.tag, 'findFirst').mockResolvedValue(mockTag);

        await expect(service.create(mockUser.id, createDto)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('findAll', () => {
      it('should allow all roles to view tags', async () => {
        const roles = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER];
        const tags = [mockTag];

        for (const role of roles) {
          jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
            ...mockProjectUser,
            role,
          });
          jest.spyOn(prismaService.tag, 'findMany').mockResolvedValue(tags);

          const result = await service.findAll(mockUser.id, mockProject.id);
          expect(result).toEqual(tags);
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
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
      };

      const mockTagWithProject = {
        ...mockTag,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(mockTagWithProject);
      });

      it('should allow OWNER to update tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.tag, 'update').mockResolvedValue({
          ...mockTag,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockTag.id, updateDto);
        expect(result.name).toBe(updateDto.name);
      });

      it('should allow ADMIN to update tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.tag, 'update').mockResolvedValue({
          ...mockTag,
          ...updateDto,
        });

        const result = await service.update(mockUser.id, mockTag.id, updateDto);
        expect(result.name).toBe(updateDto.name);
      });

      it('should deny MEMBER from updating tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.update(mockUser.id, mockTag.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should deny VIEWER from updating tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.update(mockUser.id, mockTag.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should prevent duplicate tag names on update', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.tag, 'findFirst').mockResolvedValue({
          ...mockTag,
          id: 2,
        });

        await expect(service.update(mockUser.id, mockTag.id, updateDto)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('remove', () => {
      const mockTagWithProject = {
        ...mockTag,
        project: mockProject,
      };

      beforeEach(() => {
        jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(mockTagWithProject);
      });

      it('should allow OWNER to delete tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.tag, 'delete').mockResolvedValue(mockTag);

        const result = await service.remove(mockUser.id, mockTag.id);
        expect(result).toEqual({ message: 'Tag deleted successfully' });
      });

      it('should allow ADMIN to delete tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.tag, 'delete').mockResolvedValue(mockTag);

        const result = await service.remove(mockUser.id, mockTag.id);
        expect(result).toEqual({ message: 'Tag deleted successfully' });
      });

      it('should deny MEMBER from deleting tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.MEMBER,
        });

        await expect(service.remove(mockUser.id, mockTag.id)).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER from deleting tag', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.VIEWER,
        });

        await expect(service.remove(mockUser.id, mockTag.id)).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when tag does not exist', async () => {
        jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(null);

        await expect(service.remove(mockUser.id, 999)).rejects.toThrow(NotFoundException);
      });
    });
  });
});
