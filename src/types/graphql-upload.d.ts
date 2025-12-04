declare module 'graphql-upload' {
  import type { RequestHandler } from 'express';

  export function graphqlUploadExpress(options?: {
    maxFileSize?: number;
    maxFiles?: number;
  }): RequestHandler;

  export default graphqlUploadExpress;
}

// Declare the ESM subpath used at runtime (e.g. graphql-upload/graphqlUploadExpress.mjs)
declare module 'graphql-upload/graphqlUploadExpress.mjs' {
  import type { RequestHandler } from 'express';
  export function graphqlUploadExpress(options?: {
    maxFileSize?: number;
    maxFiles?: number;
  }): RequestHandler;
  const _default: typeof graphqlUploadExpress;
  export default _default;
}

// Fallback for any other subpath imports (treated as any)
declare module 'graphql-upload/*' {
  const whatever: any;
  export default whatever;
}
