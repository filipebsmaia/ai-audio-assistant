import type { RendererApi } from '../shared/api';

declare global {
  interface Window {
    /** Exposta pelo preload (src/preload/index.ts). */
    api: RendererApi;
  }
}

export {};
