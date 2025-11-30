// 扩展后台服务工作线程
import { BilibiliVideoParser } from './services/bilibili-parser.js';
import { MultimodalAnalysisService } from './services/multimodal-analysis.js';

class BackgroundService {
  constructor() {
    this.parser = new BilibiliVideoParser();
    this.analysisService = new MultimodalAnalysisService();
    this.init();
  }

  init() {
    console.log('🚀 B站视频摘要助手后台服务启动');
    
    // 监听安装事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // 监听来自content script和popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放用于异步响应
    });
  }

  async handleInstalled(details) {
    console.log('📦 扩展安装事件:', details.reason);
    
    if (details.reason === 'install') {
      // 首次安装，打开设置页面
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/options.html')
      });
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('📨 收到消息:', request.action);

      switch (request.action) {
        case 'PARSE_VIDEO':
          return await this.parseVideo(request.data, sendResponse);
          
        case 'ANALYZE_VIDEO':
          return await this.analyzeVideo(request.data, sendResponse);
          
        case 'GET_STORAGE':
          return await this.getStorage(request.key, sendResponse);
          
        case 'SET_STORAGE':
          return await this.setStorage(request.key, request.value, sendResponse);
          
        case 'TEST_API_KEY':
          return await this.testApiKey(request.apiKey, sendResponse);
          
        default:
          console.warn('⚠️ 未知的消息类型:', request.action);
          sendResponse({ success: false, error: '未知消息类型' });
      }
    } catch (error) {
      console.error('❌ 消息处理错误:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async parseVideo(data, sendResponse) {
    try {
      console.log('🎬 开始解析视频:', data.url);
      
      const result = await this.parser.parseVideo(data.url);
      console.log('✅ 视频解析成功:', result);
      
      sendResponse({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ 视频解析失败:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async analyzeVideo(data, sendResponse) {
    try {
      console.log('🤖 开始分析视频:', data.videoData.title);
      
      // 获取API密钥
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('请先在设置页面配置API密钥');
      }

      this.analysisService.init(apiKey);
      const result = await this.analysisService.analyzeVideo(
        data.videoData,
        data.analysisType || 'general'
      );

      console.log('✅ 视频分析成功:', result.success ? '成功' : '失败');
      
      sendResponse(result);
    } catch (error) {
      console.error('❌ 视频分析失败:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async setStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        resolve(true);
      });
    });
  }

  async getApiKey() {
    return await this.getStorage('apiKey');
  }

  async testApiKey(apiKey, sendResponse) {
    try {
      this.analysisService.init(apiKey);
      const result = await this.analysisService.analyzeVideo({
        videoUrl: 'https://example.com/test.mp4',
        title: '测试视频'
      }, 'summary');
      
      sendResponse({
        success: result.success,
        error: result.success ? null : result.error
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // 通知相关方法
  showNotification(title, message, type = 'info') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message
    });
  }

  async showProgressNotification(id, title, message, progress) {
    chrome.notifications.create({
      type: 'progress',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message,
      progress: progress
    });
  }
}

// 初始化后台服务
const backgroundService = new BackgroundService();