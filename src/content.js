// B站页面内容脚本
import { BilibiliVideoParser } from './services/bilibili-parser.js';

class BilibiliContentScript {
  constructor() {
    this.parser = new BilibiliVideoParser();
    this.currentVideoUrl = null;
    this.isVideoPage = false;
    this.init();
  }

  init() {
    console.log('📄 B站内容脚本加载');
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPageObserver());
    } else {
      this.setupPageObserver();
    }
  }

  setupPageObserver() {
    // 检查是否是视频页面
    this.checkVideoPage();
    
    // 创建页面变化观察器
    const observer = new MutationObserver(() => {
      this.checkVideoPage();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkVideoPage() {
    const currentUrl = window.location.href;
    const isVideoPage = currentUrl.includes('/video/') && currentUrl.includes('BV');
    
    if (isVideoPage && this.currentVideoUrl !== currentUrl) {
      this.currentVideoUrl = currentUrl;
      this.isVideoPage = true;
      console.log('🎬 检测到视频页面:', currentUrl);
      this.onVideoPageDetected(currentUrl);
    } else if (!isVideoPage) {
      this.isVideoPage = false;
    }
  }

  async onVideoPageDetected(url) {
    try {
      console.log('🎯 开始处理视频页面');
      
      // 等待视频信息加载
      await this.waitForVideoInfo();
      
      // 提取视频信息
      const videoInfo = this.extractVideoInfo();
      
      if (videoInfo) {
        console.log('✅ 视频信息提取成功:', videoInfo);
        
        // 添加视频摘要按钮
        this.addSummaryButton(videoInfo);
        
        // 通知后台服务
        this.notifyBackground('VIDEO_DETECTED', {
          url: url,
          videoInfo: videoInfo
        });
      }
    } catch (error) {
      console.error('❌ 视频页面处理失败:', error);
    }
  }

  async waitForVideoInfo() {
    return new Promise((resolve) => {
      // 等待视频标题元素出现
      const checkInterval = setInterval(() => {
        const titleElement = document.querySelector('h1.video-title, .video-title h1, [data-title]');
        if (titleElement && titleElement.textContent.trim()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);

      // 超时设置
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  extractVideoInfo() {
    try {
      const info = {
        bvid: this.parser.extractBV(window.location.href),
        title: this.getVideoTitle(),
        owner: this.getVideoOwner(),
        duration: this.getVideoDuration(),
        view: this.getVideoViews(),
        pages: this.getVideoPages(),
        url: window.location.href
      };

      return info;
    } catch (error) {
      console.error('❌ 视频信息提取失败:', error);
      return null;
    }
  }

  getVideoTitle() {
    const selectors = [
      'h1.video-title',
      '.video-title h1',
      '[data-title]',
      'h1',
      '.title'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return document.title.replace('_哔哩哔哩_bilibili', '').trim();
  }

  getVideoOwner() {
    const selectors = [
      '.user-name',
      '.username',
      '.up-name',
      '[data-name]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return '未知作者';
  }

  getVideoDuration() {
    // B站通常在meta信息或脚本中有时长数据
    const metaDuration = document.querySelector('meta[property="og:video:duration"]');
    if (metaDuration) {
      return parseInt(metaDuration.getAttribute('content')) || 0;
    }
    
    // 尝试从页面脚本中提取
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent;
      const durationMatch = content.match(/"duration":\s*(\d+)/);
      if (durationMatch) {
        return parseInt(durationMatch[1]);
      }
    }
    
    return 0;
  }

  getVideoViews() {
    const selectors = [
      '.video-data',
      '.view',
      '[data-view]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const viewText = element.textContent.trim();
        const viewMatch = viewText.match(/(\d+)/);
        if (viewMatch) {
          return parseInt(viewMatch[1]);
        }
      }
    }
    
    return 0;
  }

  getVideoPages() {
    // 简单的分集信息提取
    const pageElements = document.querySelectorAll('.video-pagelist .page-item');
    return pageElements.length || 1;
  }

  addSummaryButton(videoInfo) {
    // 检查按钮是否已经存在
    if (document.querySelector('.bilibili-summary-btn')) {
      return;
    }

    // 创建摘要按钮
    const button = document.createElement('button');
    button.className = 'bilibili-summary-btn';
    button.innerHTML = `
      <span class="btn-icon">🤖</span>
      <span class="btn-text">AI摘要</span>
    `;
    
    // 按钮样式
    button.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      padding: 12px 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    button.addEventListener('click', () => {
      this.onSummaryButtonClick(videoInfo);
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-50%) scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(-50%) scale(1)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });

    document.body.appendChild(button);
  }

  async onSummaryButtonClick(videoInfo) {
    try {
      console.log('🔄 开始生成视频摘要:', videoInfo.title);
      
      // 显示加载状态
      this.showLoadingState();
      
      // 获取播放地址
      const playUrl = await this.parser.getVideoUrls(videoInfo.bvid);
      
      // 准备分析数据
      const analysisData = {
        videoUrl: playUrl.durl[0].url,
        title: videoInfo.title,
        owner: videoInfo.owner,
        duration: videoInfo.duration,
        view: videoInfo.view,
        pages: videoInfo.pages
      };

      // 发送分析请求到后台
      const result = await this.sendMessageToBackground('ANALYZE_VIDEO', {
        videoData: analysisData,
        analysisType: 'general'
      });

      if (result.success) {
        this.showAnalysisResult(result);
      } else {
        this.showError('分析失败', result.error || '未知错误');
      }
      
    } catch (error) {
      console.error('❌ 摘要生成失败:', error);
      this.showError('摘要生成失败', error.message);
    }
  }

  showLoadingState() {
    const button = document.querySelector('.bilibili-summary-btn');
    if (button) {
      button.disabled = true;
      button.innerHTML = `
        <span class="btn-icon">⏳</span>
        <span class="btn-text">分析中...</span>
      `;
    }
  }

  showAnalysisResult(result) {
    // 创建结果弹窗
    const modal = document.createElement('div');
    modal.className = 'analysis-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>🎬 视频分析结果</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analysis-content">
            ${result.summary.replace(/\n/g, '<br>')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="copy-btn">复制结果</button>
        </div>
      </div>
    `;

    // 添加样式
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
      .analysis-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      .analysis-modal .modal-content {
        position: relative;
        background: white;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80%;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }
      .analysis-modal .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .analysis-modal .modal-header h3 {
        margin: 0;
        color: #333;
      }
      .analysis-modal .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
      }
      .analysis-modal .modal-body {
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }
      .analysis-modal .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        text-align: right;
      }
      .analysis-modal .copy-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
      }
      .analysis-modal .analysis-content {
        line-height: 1.6;
        color: #333;
      }
    `;

    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);

    // 绑定事件
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      document.head.removeChild(modalStyle);
    });

    modal.querySelector('.modal-overlay').addEventListener('click', () => {
      document.body.removeChild(modal);
      document.head.removeChild(modalStyle);
    });

    modal.querySelector('.copy-btn').addEventListener('click', () => {
      const text = result.summary;
      navigator.clipboard.writeText(text).then(() => {
        alert('结果已复制到剪贴板');
      });
    });

    // 重置按钮状态
    this.resetButtonState();
  }

  showError(title, message) {
    alert(`${title}: ${message}`);
    this.resetButtonState();
  }

  resetButtonState() {
    const button = document.querySelector('.bilibili-summary-btn');
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <span class="btn-icon">🤖</span>
        <span class="btn-text">AI摘要</span>
      `;
    }
  }

  sendMessageToBackground(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, resolve);
    });
  }

  async notifyBackground(action, data) {
    try {
      await this.sendMessageToBackground(action, data);
    } catch (error) {
      console.error('❌ 后台通知失败:', error);
    }
  }
}

// 初始化内容脚本
if (window.location.hostname.includes('bilibili.com')) {
  new BilibiliContentScript();
}