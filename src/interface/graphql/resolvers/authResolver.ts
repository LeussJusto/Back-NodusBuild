import authService from '../../../application/services';
import { RegisterDTO, LoginDTO } from '../../../application/dto/authDTO';
import {
  RegisterInputGQL,
  LoginInputGQL,
  AuthPayloadGQL,
  UserGQL,
} from '../types/userTypes';

const authResolver = {
  Query: {
    me: async (_: any, __: any, { user }: any): Promise<UserGQL | null> => {
      return (user as any) || null;
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: RegisterInputGQL }): Promise<AuthPayloadGQL> => {
      // Map GraphQL input -> application DTO
      const dto: RegisterDTO = {
        email: input.email,
        password: input.password,
        profile: input.profile
          ? {
              firstName: input.profile.firstName ?? undefined,
              lastName: input.profile.lastName ?? undefined,
              phone: input.profile.phone ?? undefined,
            }
          : undefined,
      };

      const { user, token } = await authService.register(dto as any);
      return { token, user: user as any } as AuthPayloadGQL;
    },

    login: async (_: any, { email, password }: LoginInputGQL): Promise<AuthPayloadGQL> => {
      const dto: LoginDTO = { email, password };
      const { user, token } = await authService.login(dto as any);
      return { token, user: user as any } as AuthPayloadGQL;
    },

    logout: async (_: any, __: any, { token }: any) => {
      // token is injected into context
      await authService.logout(token);
      return true;
    },

    uploadAvatar: async (_: any, { avatarUrl }: any, { user }: any) => {
      if (!user) throw new Error('Not authenticated');
      const updated = await authService.uploadAvatar(user.id || user._id, avatarUrl);
      return updated;
    },
  },
};

export default authResolver;
