import { IResolvers } from '@graphql-tools/utils';
import { messageService } from '../../../infrastructure/container';

const resolvers: IResolvers = {
  Query: {
    messages: async (_: any, args: { chatId: string; limit?: number; offset?: number }) => {
      // Authentication check (reuse requireAuth if you have it on ctx)
      const { chatId, limit = 50, offset = 0 } = args;
      // Optionally require auth
      // const { userId } = requireAuth(ctx);
      // Verify user belongs to chat
      // await ctx.chatService.getChatById(chatId, userId);

      const { items, total } = await messageService.listByChatWithTotal(chatId, limit, offset);
      return {
        items: items.reverse(), // stored descending; return ascending by createdAt
        total,
        limit,
        offset,
      };
    },
  },
};

export default resolvers;
