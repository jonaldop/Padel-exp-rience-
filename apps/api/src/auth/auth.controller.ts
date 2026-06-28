import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { CurrentUser, JwtGuard } from './jwt.guard';
import { DbService } from '../db/db.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly db: DbService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('forgot')
  forgot(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email || '');
  }

  @Post('reset')
  reset(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token || '', body.password || '');
  }

  /** Profil de l'utilisateur connecté (+ son compte). */
  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    const dbUser = this.db.findUserById(user.sub);
    return {
      user: dbUser && {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
      },
      account: dbUser?.account,
    };
  }
}
