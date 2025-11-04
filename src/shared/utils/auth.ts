// Utilidades de autenticación reutilizables en resolvers

export function getUserId(user: any): string | null {
  if (!user) return null;
  return (user.id as string) || (user._id as string) || null;
}

export function requireAuth(ctx: any): { user: any; userId: string } {
  const user = ctx?.user;
  if (!user) {
    throw new Error('No autenticado');
  }
  const userId = getUserId(user);
  if (!userId) {
    throw new Error('No autenticado');
  }
  return { user, userId };
}
