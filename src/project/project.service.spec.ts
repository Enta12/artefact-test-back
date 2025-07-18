import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma';
import { NotFoundException } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

describe('ProjectService', () => {
  let service: ProjectService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
    projectUsers: [
      {
        id: 1,
        projectId: 1,
        userId: mockUser.id,
        role: Role.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      },
    ],
    columns: [],
    tags: [],
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
        ProjectService,
        {
          provide: PrismaService,
          useValue: {
            project: {
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
            column: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => {
              const tx = {
                project: {
                  create: jest.fn().mockResolvedValue(mockProject),
                },
                column: {
                  create: jest.fn(),
                },
              };
              return callback(tx);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Role-based Access Control', () => {
    describe('update', () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      it('should allow OWNER to update project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.project, 'update').mockResolvedValue({
          ...mockProject,
          ...updateDto,
        });

        const result = await service.update(mockProject.id, mockUser.id, updateDto);
        expect(result.name).toBe(updateDto.name);
        expect(result.description).toBe(updateDto.description);
      });

      it('should allow ADMIN to update project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.ADMIN,
        });
        jest.spyOn(prismaService.project, 'update').mockResolvedValue({
          ...mockProject,
          ...updateDto,
        });

        const result = await service.update(mockProject.id, mockUser.id, updateDto);
        expect(result.name).toBe(updateDto.name);
        expect(result.description).toBe(updateDto.description);
      });

      it('should deny MEMBER from updating project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.update(mockProject.id, mockUser.id, updateDto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should deny VIEWER from updating project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.update(mockProject.id, mockUser.id, updateDto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should deny access when user is not in project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.update(mockProject.id, mockUser.id, updateDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('remove', () => {
      it('should allow OWNER to delete project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue({
          ...mockProjectUser,
          role: Role.OWNER,
        });
        jest.spyOn(prismaService.project, 'delete').mockResolvedValue(mockProject);

        const result = await service.remove(mockProject.id, mockUser.id);
        expect(result).toEqual(mockProject);
      });

      it('should deny ADMIN from deleting project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.remove(mockProject.id, mockUser.id)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should deny MEMBER from deleting project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.remove(mockProject.id, mockUser.id)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should deny VIEWER from deleting project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.remove(mockProject.id, mockUser.id)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should deny access when user is not in project', async () => {
        jest.spyOn(prismaService.projectUser, 'findFirst').mockResolvedValue(null);

        await expect(service.remove(mockProject.id, mockUser.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('create', () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      };

      it('should create project and set user as OWNER', async () => {
        const mockProjectWithOwner = {
          ...mockProject,
          ...createDto,
          projectUsers: [
            {
              id: 1,
              projectId: mockProject.id,
              userId: mockUser.id,
              role: Role.OWNER,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        };

        const transactionMock = jest.fn().mockImplementation(async (callback) => {
          const tx = {
            project: {
              create: jest.fn().mockResolvedValue(mockProjectWithOwner),
            },
            column: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          await Promise.resolve();
          return callback(tx);
        });

        jest.spyOn(prismaService, '$transaction').mockImplementation(transactionMock);

        const result = await service.create(mockUser.id, createDto);
        expect(result.projectUsers[0].role).toBe(Role.OWNER);
        expect(result.name).toBe(createDto.name);
      });

      it('should create default "To Do" column', async () => {
        const mockColumnCreate = jest.fn();
        const transactionMock = jest.fn().mockImplementation(async (callback) => {
          const tx = {
            project: {
              create: jest.fn().mockResolvedValue(mockProject),
            },
            column: {
              create: mockColumnCreate,
            },
          };
          await Promise.resolve();
          return callback(tx);
        });

        jest.spyOn(prismaService, '$transaction').mockImplementation(transactionMock);

        await service.create(mockUser.id, createDto);
        expect(mockColumnCreate).toHaveBeenCalledWith({
          data: {
            name: 'To Do',
            position: 0,
            projectId: mockProject.id,
          },
        });
      });
    });

    describe('findOne', () => {
      it('should return project when user has access', async () => {
        jest.spyOn(prismaService.project, 'findFirst').mockResolvedValue(mockProject);

        const result = await service.findOne(mockProject.id, mockUser.id);
        expect(result).toEqual(mockProject);
      });

      it('should throw NotFoundException when project not found', async () => {
        jest.spyOn(prismaService.project, 'findFirst').mockResolvedValue(null);

        await expect(service.findOne(999, mockUser.id)).rejects.toThrow(NotFoundException);
      });
    });
  });
});
