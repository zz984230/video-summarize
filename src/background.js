// 扩展后台服务工作线程
import { BilibiliVideoParser } from './services/bilibili-parser.js';

class BackgroundService {
  constructor() {
    this.parser = new BilibiliVideoParser();
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

        case 'VIDEO_DETECTED':
          console.log('📹 检测到视频页面:', request.data.videoInfo?.title || '未知标题');
          // 视频检测成功，可以在这里添加其他处理逻辑
          sendResponse({ success: true, message: '视频检测成功' });
          return;

        case 'GET_STORAGE':
          return await this.getStorage(request.key, sendResponse);

        case 'SET_STORAGE':
          return await this.setStorage(request.key, request.value, sendResponse);

        case 'START_STREAM_ANALYSIS':
          this.handleStreamAnalysis(request.data, sendResponse, sender);
          return true;

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

  async handleStreamAnalysis(data, sendResponse, sender) {
    const { videoData, analysisType } = data;

    try {
      console.log('🎬 [Background] Starting stream analysis for:', videoData.bvid);

      // 从存储获取API配置
      const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId']);
      console.log('📋 [Background] Storage result:', JSON.stringify(result));

      if (!result.apiKey) {
        console.error('❌ [Background] No API key found');
        sendResponse({
          success: false,
          error: '请先在设置页面配置API密钥'
        });
        return;
      }

      const config = {
        apiKey: result.apiKey,
        apiUrl: result.apiUrl || 'https://api-inference.modelscope.cn/v1',
        modelId: result.modelId || 'Qwen/Qwen3-VL-8B-Instruct'
      };
      console.log('✅ [Background] Config prepared:', { apiUrl: config.apiUrl, modelId: config.modelId });

      // 获取发送者标签页ID
      const senderTabId = sender.tab?.id;
      if (!senderTabId) {
        console.error('❌ [Background] No sender tab ID');
        sendResponse({
          success: false,
          error: '无法获取标签页信息'
        });
        return;
      }

      // 立即发送响应，然后异步处理流式分析
      sendResponse({ success: true });
      console.log('✅ [Background] Response sent, starting async analysis');

      // 发送流式分析请求（不等待）
      this.streamVideoAnalysis(videoData, analysisType, config, senderTabId).catch(error => {
        console.error('❌ [Background] Async stream analysis failed:', error);
        this.sendDebugMessage(`bg_final_error: ${error.message}`, senderTabId);
      });

    } catch (error) {
      console.error('❌ [Background] Stream analysis failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async streamVideoAnalysis(videoData, analysisType, config, senderTabId) {
    console.log('🎬 [Background] Starting stream analysis:', videoData.title || videoData.bvid);

    try {
      // 优先使用实际的MP4视频URL，如果不可用则尝试其他格式
      let videoIdentifier = null;

      // 首选：直接的MP4视频URL
      if (videoData.videoUrl) {
        videoIdentifier = videoData.videoUrl;
      }
      // 备选：页面URL
      else if (videoData.pageUrl) {
        videoIdentifier = videoData.pageUrl;
      }
      // 最后备选：BV号
      else if (videoData.bvid) {
        videoIdentifier = videoData.bvid;
      }

      if (!videoIdentifier) {
        throw new Error('视频标识符为空');
      }

      this.sendDebugMessage(`bg_video_identifier: ${videoIdentifier.substring(0, 100)}`, senderTabId);
      this.sendDebugMessage(`bg_identifier_type: ${videoIdentifier.startsWith('http') ? 'URL' : 'BV ID'}`, senderTabId);

      // 构建提示词
      const prompt = this.buildAnalysisPrompt(videoData, analysisType);

      // 构建API请求
      const requestBody = {
        model: config.modelId,
        stream: true,
        messages: [{
          role: 'user',
          content: [
            { type: 'video_url', video_url: videoIdentifier },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 800,
        temperature: 0.7
      };

      this.sendDebugMessage(`bg_api_url: ${config.apiUrl}/chat/completions`, senderTabId);
      this.sendDebugMessage(`bg_fetch_start`, senderTabId);

      // 发送流式请求
      const response = await fetch(`${config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      this.sendDebugMessage(`bg_response_status: ${response.status}`, senderTabId);

      if (!response.ok) {
        const errorText = await response.text();
        this.sendDebugMessage(`bg_api_error: ${response.status} ${errorText.substring(0, 200)}`, senderTabId);

        // 解析错误并抛出
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`API请求失败: ${response.status} ${errorText}`);
        }

        this.sendDebugMessage(`bg_parsed_error: ${JSON.stringify(errorObj).substring(0, 300)}`, senderTabId);

        // 如果是 video_url 格式错误，直接抛出错误提示用户
        if (errorObj.error?.code === '1214' || errorObj.error?.message?.includes('video_url格式错误')) {
          throw new Error('该视频格式暂不支持AI分析，请尝试其他视频或联系开发者');
        }

        throw new Error(`API请求失败: ${response.status} ${errorText}`);
      }

      this.sendDebugMessage(`bg_stream_start`, senderTabId);
      // 解析SSE流
      await this.parseSSEStream(response, videoData.bvid, senderTabId);

    } catch (error) {
      this.sendDebugMessage(`bg_error: ${error.message}`, senderTabId);
      console.error('❌ [Background] Stream analysis error:', error);
      this.sendStreamError(videoData.bvid, error.message, senderTabId);
      throw error;
    }
  }

  sendDebugMessage(message, senderTabId) {
    chrome.tabs.sendMessage(senderTabId, {
      action: 'DEBUG_MESSAGE',
      data: { message }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('⚠️ [Background] Debug message not delivered:', chrome.runtime.lastError.message);
      }
    });
  }

  buildAnalysisPrompt(videoData, analysisType) {
    const baseInfo = {
      title: videoData.title,
      owner: videoData.owner
    };

    // 简化的文字摘要提示词 - 只分析文字内容，500字左右
    const summaryPrompt = `请为这个B站视频生成简洁的文字摘要（500字以内）。

视频信息：
- 标题：${baseInfo.title}
- UP主：${baseInfo.owner}

请从以下角度分析：
1. 视频主题：一句话概括视频讲什么
2. 核心观点：提取2-3个主要观点或信息点
3. 关键细节：重要的数据、案例或说明

要求：
- 只基于标题和可能的文字内容进行提取
- 不要描述视频画面、UP主语气或说话风格
- 使用简洁的段落式表达
- 每个部分用空行分隔

输出格式：
视频主题
[内容]

核心观点
[内容]

关键细节
[内容]`;

    const prompts = {
      summary: summaryPrompt,
      general: summaryPrompt
    };

    return prompts[analysisType] || prompts.summary;
  }

  async parseSSEStream(response, bvid, senderTabId) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ [Background] Stream completed');
          this.sendStreamEnd(bvid, fullContent, senderTabId);
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
              this.sendStreamEnd(bvid, fullContent, senderTabId);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // 优先使用 content，如果没有则使用 reasoning_content
              // 注意：reasoning_content 是模型思考过程，理想情况应该被过滤
              // 但智谱 API 在某些情况下只返回 reasoning_content
              const content = delta?.content || delta?.reasoning_content;

              if (content) {
                fullContent += content;
                this.sendStreamChunk(bvid, content, senderTabId);
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

  sendStreamChunk(bvid, content, senderTabId) {
    chrome.tabs.sendMessage(senderTabId, {
      action: 'STREAM_CHUNK',
      data: { content }
    });
  }

  sendStreamEnd(bvid, fullContent, senderTabId) {
    chrome.tabs.sendMessage(senderTabId, {
      action: 'STREAM_END',
      data: { content: fullContent }
    });
  }

  sendStreamError(bvid, error, senderTabId) {
    chrome.tabs.sendMessage(senderTabId, {
      action: 'STREAM_ERROR',
      data: { error }
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