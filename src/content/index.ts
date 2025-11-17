import { VideoExtractor } from '../services/videoExtractor';

// 内容脚本，负责与页面交互
class ContentScript {
  private currentVideoInfo: { url: string; data: unknown } | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request: { action: string }, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
      if (request.action === 'getVideoInfo') {
        this.handleGetVideoInfo(sendResponse);
        return true; // 保持消息通道开放
      }
    });

    // 监听页面变化
    this.observePageChanges();
  }

  private handleGetVideoInfo(sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void) {
    try {
      const videoInfo = VideoExtractor.extractVideoInfo();
      sendResponse({
        success: true,
        data: videoInfo
      });
    } catch (error) {
      console.error('获取视频信息失败:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  private observePageChanges() {
    // 监听URL变化（B站是单页应用）
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        // 通知background脚本页面已变化
        chrome.runtime.sendMessage({
          action: 'pageChanged',
          url: currentUrl
        });
      }
    }).observe(document, { subtree: true, childList: true });
  }
}

// 初始化内容脚本
new ContentScript();