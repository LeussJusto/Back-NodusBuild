import { RegisterDTO, LoginDTO } from '../../../application/dto/authDTO';
import { z } from 'zod';
import {
  RegisterInputGQL,
  LoginInputGQL,
  AuthPayloadGQL,
  UserGQL,
} from '../types/userTypes';
import { requireAuth } from '../../../shared/utils/auth';

const authResolver = {
  Query: {
    // Devuelve el usuario autenticado actual
    me: async (_: any, __: any, { user }: any): Promise<UserGQL | null> => {
      return (user as any) || null;
    },
  },

  Mutation: {
    register: async (
      _: any,
      { input }: { input: RegisterInputGQL },
      { authService }: any
    ): Promise<AuthPayloadGQL> => {
      const RegisterSchema = z.object({
        email: z.string().email(),
        password: z.string().min(5),
        profile: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().optional(),
          })
          .optional(),
      });

      const parsed = RegisterSchema.parse(input);
      const dto: RegisterDTO = {
        email: parsed.email,
        password: parsed.password,
        profile: parsed.profile,
      };

      const { user, token } = await authService.register(dto as any);
      return { token, user: user as any } as AuthPayloadGQL;
    },

    login: async (
      _: any,
      { email, password }: LoginInputGQL,
      { authService }: any
    ): Promise<AuthPayloadGQL> => {
      // Valida credenciales de login
      const LoginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(5),
      });
      const { email: em, password: pw } = LoginSchema.parse({ email, password });
      const dto: LoginDTO = { email: em, password: pw };
      const { user, token } = await authService.login(dto as any);
      return { token, user: user as any } as AuthPayloadGQL;
    },

    logout: async (_: any, __: any, { token, authService }: any) => {
      await authService.logout(token);
      return true;
    },

    uploadAvatar: async (_: any, { avatarUrl }: any, ctx: any) => {
      const { userId } = requireAuth(ctx);
      const { authService } = ctx;
      const updated = await authService.uploadAvatar(userId, avatarUrl);
      return updated;
    },
  },
};

export default authResolver;
