import { StorageService } from '../services/storage';
import { ModelConfig } from '../types';

// 背景脚本，负责处理核心逻辑
class BackgroundScript {
  constructor() {
    this.init();
  }

  private init() {
    // 监听来自content script和popup的消息
    chrome.runtime.onMessage.addListener((request: { action: string; [key: string]: unknown }, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听插件安装事件
    chrome.runtime.onInstalled.addListener(() => {
      console.log('B站视频摘要助手已安装');
    });
  }

  private async handleMessage(request: { action: string; [key: string]: unknown }, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) {
    try {
      switch (request.action) {
        case 'pageChanged':
          // 页面变化，可以在这里做相应处理
          console.log('页面变化:', request.url);
          break;

        case 'saveConfig':
          await StorageService.setModelConfig(request.config as ModelConfig);
          sendResponse({ success: true });
          break;

        case 'getConfig': {
          const config = await StorageService.getModelConfig();
          sendResponse({ success: true, data: config });
          break;
        }

        case 'saveResult':
          await StorageService.addToCache(request.record);
          await StorageService.setLastProcessed(request.record);
          sendResponse({ success: true });
          break;

        case 'getCache': {
          const cache = await StorageService.getCache();
          sendResponse({ success: true, data: cache });
          break;
        }

        case 'getLastProcessed': {
          const lastProcessed = await StorageService.getLastProcessed();
          sendResponse({ success: true, data: lastProcessed });
          break;
        }

        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}

// 初始化背景脚本
new BackgroundScript();