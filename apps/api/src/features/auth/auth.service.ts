import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service.js';

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      user_metadata: { full_name: input.displayName },
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Sign up failed');
    }
    // Sign in to get tokens
    const { data: signInData, error: signInError } =
      await this.supabase.admin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
    if (signInError || !signInData.session) {
      throw new Error(signInError?.message ?? 'Sign in after signup failed');
    }
    return {
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      expiresIn: signInData.session.expires_in,
      user: {
        id: signInData.session.user.id,
        email: signInData.session.user.email ?? input.email,
      },
    };
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    const { data, error } = await this.supabase.admin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session) {
      throw new Error(error?.message ?? 'Invalid credentials');
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.session.user.id,
        email: data.session.user.email ?? input.email,
      },
    };
  }
}
