/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/user.dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const expectedResult = {
        id: 1,
        email: registerDto.email,
        name: registerDto.name,
        access_token: 'jwt_token',
      };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto, mockResponse);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        expectedResult.access_token,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should throw BadRequestException when registration fails', async () => {
      mockAuthService.register.mockRejectedValue(new BadRequestException('Email already exists'));

      await expect(controller.register(registerDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when email is invalid', async () => {
      const invalidDto = { ...registerDto, email: 'invalid-email' };
      mockAuthService.register.mockRejectedValue(new BadRequestException('Invalid email format'));

      await expect(controller.register(invalidDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when password is too short', async () => {
      const invalidDto = { ...registerDto, password: '123' };
      mockAuthService.register.mockRejectedValue(
        new BadRequestException('Password must be at least 8 characters'),
      );

      await expect(controller.register(invalidDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 1,
      email: loginDto.email,
      name: 'Test User',
    };

    const mockToken = { access_token: 'jwt_token' };

    it('should login user successfully', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockReturnValue(mockToken);

      const result = await controller.login(loginDto, mockResponse);

      expect(result).toEqual(mockToken);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        mockToken.access_token,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should throw UnauthorizedException when login fails', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockAuthService.validateUser.mockRejectedValue(new UnauthorizedException('User not found'));

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockAuthService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid password'));

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('should return a valid JWT token structure', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockToken);

      const result = await controller.login(loginDto, mockResponse);

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
    });
  });

  describe('JWT Strategy', () => {
    let jwtStrategy: JwtStrategy;
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: PrismaService,
            useValue: {
              user: {
                findUnique: jest.fn().mockResolvedValue({
                  id: 1,
                  email: 'test@example.com',
                  name: 'Test User',
                }),
              },
            },
          },
        ],
      }).compile();
      jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should validate JWT payload correctly', async () => {
      const payload = { sub: 1, email: 'test@example.com' };
      const result = await jwtStrategy.validate(payload);
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should handle empty payload gracefully', async () => {
      const mockPrismaService = module.get<PrismaService>(PrismaService);
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 0,
        email: '',
        name: '',
      });

      const payload = { sub: 0, email: '' };
      const result = await jwtStrategy.validate(payload);
      expect(result).toEqual({
        id: 0,
        email: '',
        name: '',
      });
    });
  });
});
