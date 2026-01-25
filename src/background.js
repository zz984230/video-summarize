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
        url: chrome.runtime.getURL('options.html')
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
          
        case 'VIDEO_DETECTED':
          console.log('📹 检测到视频页面:', request.data.videoInfo?.title || '未知标题');
          // 视频检测成功，可以在这里添加其他处理逻辑
          sendResponse({ success: true, message: '视频检测成功' });
          return;
          
        case 'GET_STORAGE':
          return await this.getStorage(request.key, sendResponse);
          
        case 'SET_STORAGE':
          return await this.setStorage(request.key, request.value, sendResponse);
          
        case 'TEST_API_KEY':
          return await this.testApiKey(request.apiKey, sendResponse);

        case 'START_STREAM_ANALYSIS':
          return await this.handleStreamAnalysis(request.data, sendResponse);

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

  async handleStreamAnalysis(data, sendResponse) {
    const { videoData, analysisType } = data;

    try {
      console.log('🎬 [Background] Starting stream analysis for:', videoData.bvid);

      // 从存储获取API配置
      const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId']);

      if (!result.apiKey) {
        sendResponse({
          success: false,
          error: '请先在设置页面配置API密钥'
        });
        return;
      }

      const config = {
        apiKey: result.apiKey,
        apiUrl: result.apiUrl || 'https://open.bigmodel.cn/api/paas/v4',
        modelId: result.modelId || 'glm-4.6v-flash'
      };

      // 发送流式分析请求
      await this.streamVideoAnalysis(videoData, analysisType, config);

      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ [Background] Stream analysis failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async streamVideoAnalysis(videoData, analysisType, config) {
    console.log('🎬 [Background] Starting stream analysis:', videoData.bvid);

    try {
      // 获取视频URL
      const videoInfo = await this.parser.getVideoInfo(videoData.bvid);
      const videoUrls = await this.parser.getVideoUrls(videoInfo.aid, videoInfo.cid, 64);

      if (!videoUrls || videoUrls.length === 0) {
        throw new Error('无法获取视频URL');
      }

      const videoUrl = videoUrls[0].url;

      // 构建提示词
      const prompt = this.buildAnalysisPrompt(videoData, analysisType);

      // 构建API请求
      const requestBody = {
        model: config.modelId,
        stream: true,
        messages: [{
          role: 'user',
          content: [
            { type: 'video_url', video_url: videoUrl },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 1000,
        temperature: 0.7
      };

      // 发送流式请求
      const response = await fetch(`${config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} ${errorText}`);
      }

      // 解析SSE流
      await this.parseSSEStream(response, videoData.bvid);

    } catch (error) {
      console.error('❌ [Background] Stream analysis error:', error);
      this.sendStreamError(videoData.bvid, error.message);
      throw error;
    }
  }

  buildAnalysisPrompt(videoData, analysisType) {
    const baseInfo = {
      title: videoData.title,
      owner: videoData.owner,
      duration: videoData.duration,
      view: videoData.view
    };

    const prompts = {
      general: `请详细分析这个视频的内容，包括：
1. 视频主题和核心内容
2. 主要观点和关键信息
3. 值得注意的细节
4. 总结和评价

视频信息：
- 标题：${baseInfo.title}
- UP主：${baseInfo.owner}
- 时长：${baseInfo.duration}
- 播放量：${baseInfo.view}`,

      summary: `请为这个视频生成简洁的摘要（200字以内）。

视频信息：
- 标题：${baseInfo.title}
- UP主：${baseInfo.owner}`,

      technical: `请从技术角度分析这个视频。

视频信息：
- 标题：${baseInfo.title}
- UP主：${baseInfo.owner}`
    };

    return prompts[analysisType] || prompts.general;
  }

  async parseSSEStream(response, bvid) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ [Background] Stream completed');
          this.sendStreamEnd(bvid, fullContent);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              console.log('✅ [Background] Stream completed with [DONE]');
              this.sendStreamEnd(bvid, fullContent);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                fullContent += content;
                this.sendStreamChunk(bvid, content);
              }
            } catch (e) {
              console.warn('⚠️ [Background] Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  sendStreamChunk(bvid, content) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'STREAM_CHUNK',
          data: { content }
        });
      }
    });
  }

  sendStreamEnd(bvid, fullContent) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'STREAM_END',
          data: { content: fullContent }
        });
      }
    });
  }

  sendStreamError(bvid, error) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'STREAM_ERROR',
          data: { error }
        });
      }
    });
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