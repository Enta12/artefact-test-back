//TODO: Configure cross-origin cookies for production deployment
import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  private getCookieOptions() {
    return process.env.NODE_ENV === 'production'
      ? {
          httpOnly: true,
          secure: true,
          sameSite: 'none' as const,
          domain: '.pepintrie.fr',
          maxAge: 24 * 60 * 60 * 1000,
        }
      : {
          httpOnly: true,
          secure: false,
          sameSite: 'lax' as const,
          maxAge: 24 * 60 * 60 * 1000,
        };
  }

  @Post('register')
  async register(@Body() dto: CreateUserDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);
    response.cookie('token', result.access_token, this.getCookieOptions());
    return result;
  }

  @Post('login')
  async login(
    @Body() dto: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const result = this.authService.login(user);
    response.cookie('token', result.access_token, this.getCookieOptions());
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('token', this.getCookieOptions());
    return { message: 'Déconnexion réussie' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: (req.user as any).id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    return user;
  }
}
