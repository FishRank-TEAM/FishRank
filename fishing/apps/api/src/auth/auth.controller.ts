import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '이메일 회원가입' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '이메일 로그인' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '액세스 토큰 갱신' })
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return { success: true, data: result };
  }
}
