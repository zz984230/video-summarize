/// <reference types="chrome" />

declare global {
  interface Window {
    __INITIAL_STATE__?: {
      bvid?: string;
      videoData?: {
        duration?: number;
        pic?: string;
        cid?: string;
      };
    };
  }
}

export {};