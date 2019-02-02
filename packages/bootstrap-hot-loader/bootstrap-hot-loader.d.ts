declare module 'bootstrap-hot-loader' {
  import { Router } from 'express';

  export function hot(
    module: NodeModule,
    wrappedFunction: (router: Router, context?: any) => Router
  ): (router: Router, context?: any) => Router
}
