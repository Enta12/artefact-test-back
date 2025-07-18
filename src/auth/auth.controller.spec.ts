import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/user.dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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
      const expectedResult = { id: 1, email: registerDto.email, name: registerDto.name };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when registration fails', async () => {
      mockAuthService.register.mockRejectedValue(new BadRequestException('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when email is invalid', async () => {
      const invalidDto = { ...registerDto, email: 'invalid-email' };
      mockAuthService.register.mockRejectedValue(new BadRequestException('Invalid email format'));

      await expect(controller.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is too short', async () => {
      const invalidDto = { ...registerDto, password: '123' };
      mockAuthService.register.mockRejectedValue(
        new BadRequestException('Password must be at least 8 characters'),
      );

      await expect(controller.register(invalidDto)).rejects.toThrow(BadRequestException);
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
      mockAuthService.login.mockResolvedValue(mockToken);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockToken);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException when login fails', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockAuthService.validateUser.mockRejectedValue(new UnauthorizedException('User not found'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockAuthService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid password'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return a valid JWT token structure', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockToken);

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
    });
  });
});
