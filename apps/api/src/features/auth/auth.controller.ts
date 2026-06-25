import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';

const SignUpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const SignInBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({ status: 201, description: 'User created and signed in' })
  async signUp(
    @Body(new ZodValidationPipe(SignUpBodySchema))
    body: z.infer<typeof SignUpBodySchema>,
  ) {
    return this.authService.signUp(body);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async signIn(
    @Body(new ZodValidationPipe(SignInBodySchema))
    body: z.infer<typeof SignInBodySchema>,
  ) {
    return this.authService.signIn(body);
  }
}
