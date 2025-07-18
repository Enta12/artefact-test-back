import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './UserController';
import { UserModule } from './user.module';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

describe('UserModule Integration Tests', () => {
  let module: TestingModule;
  let controller: UserController;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        UserModule,
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [JwtStrategy],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Authenticated requests', () => {
    it('should return user profile when authenticated', () => {
      const req = { user: mockUser };
      const result = controller.getProfile(req);
      expect(result).toEqual(mockUser);
    });
  });

  describe('Unauthenticated requests', () => {
    it('should return undefined when no user in context', () => {
      const req = {}; // Pas d'utilisateur dans le contexte
      const result = controller.getProfile(req);
      expect(result).toBeUndefined();
    });
  });

  describe('JWT Strategy', () => {
    let jwtStrategy: JwtStrategy;

    beforeEach(() => {
      jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should validate JWT payload correctly', () => {
      const payload = { sub: 1, email: 'test@example.com' };
      const result = jwtStrategy.validate(payload);
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
      });
    });

    it('should handle empty payload gracefully', () => {
      const payload = { sub: 0, email: '' };
      const result = jwtStrategy.validate(payload);
      expect(result).toEqual({
        id: 0,
        email: '',
      });
    });
  });
});
