import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

if (process.env.NODE_ENV === 'development') {
  worker.start();
} 