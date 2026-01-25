// B站页面内容脚本
import { BilibiliVideoParser } from './services/bilibili-parser.js';

class BilibiliContentScript {
  constructor() {
    this.parser = new BilibiliVideoParser();
    this.currentVideoUrl = null;
    this.isVideoPage = false;
    // 新增：流式相关状态
    this.currentModal = null;
    this.fullContent = '';
    this.init();

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      this.closeModal();
    });
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
      
      console.log('✅ 视频信息提取成功:', videoInfo);
      
      // 保存当前视频信息，供按钮点击时使用
      this.currentVideoInfo = videoInfo;
      console.log('✅ 当前视频信息已保存:', this.currentVideoInfo);
      
      // 添加视频摘要按钮
      this.addSummaryButton(videoInfo);
      
      // 通知后台服务
      this.notifyBackground('VIDEO_DETECTED', {
        url: url,
        videoInfo: videoInfo
      });
      
    } catch (error) {
      console.error('❌ 视频页面处理失败:', error);
      console.error('❌ 错误详情:', error.stack);
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
      console.log('🔍 开始提取视频信息...');
      
      // 1. 提取BV号
      let bvid = null;
      try {
        bvid = this.parser.extractBV(window.location.href);
        console.log('✅ BV号提取成功:', bvid);
      } catch (error) {
        console.error('❌ BV号提取失败:', error);
        throw new Error(`无法从URL提取BV号: ${window.location.href}`);
      }
      
      // 2. 提取其他信息
      const title = this.getVideoTitle();
      const owner = this.getVideoOwner();
      const duration = this.getVideoDuration();
      const view = this.getVideoViews();
      const pages = this.getVideoPages();
      
      console.log('✅ 视频信息提取完成:', {
        bvid,
        title,
        owner,
        duration,
        view,
        pages,
        url: window.location.href
      });

      const info = {
        bvid,
        title,
        owner,
        duration,
        view,
        pages,
        url: window.location.href
      };

      return info;
    } catch (error) {
      console.error('❌ 视频信息提取失败:', error);
      throw error; // 重新抛出错误，不要返回null
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

  createStreamModal() {
    const modal = document.createElement('div');
    modal.className = 'stream-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>🎬 视频分析中...</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>AI正在观看视频并生成摘要</p>
          </div>
          <div class="stream-content" id="streamContent"></div>
        </div>
        <div class="modal-footer">
          <span class="status-badge generating">生成中</span>
          <button class="copy-btn" disabled>复制结果</button>
        </div>
      </div>
    `;
    this.addModalStyles(modal);
    this.bindModalEvents(modal);
    return modal;
  }

  async onSummaryButtonClick() {
    try {
      console.log('🔄 点击AI摘要按钮，开始分析...');
      this.showLoadingState();
      
      // 检查是否有当前视频信息
      if (!this.currentVideoInfo) {
        throw new Error('未找到视频信息，请刷新页面重试');
      }
      
      console.log('✅ 当前视频信息:', this.currentVideoInfo);
      
      // 获取当前页面视频信息 - 使用测试文件中验证过的方法
      console.log('🔍 开始获取视频详细信息...');
      const videoInfo = await this.parser.getVideoInfo(this.currentVideoInfo.bvid);
      
      console.log('✅ 视频基本信息获取成功:', {
        bvid: videoInfo.bvid,
        title: videoInfo.title,
        aid: videoInfo.aid,
        cid: videoInfo.pages[0].cid
      });
      
      // 获取播放地址 - 修复API调用参数问题
      console.log('🔍 开始获取视频播放地址...');
      const videoUrls = await this.parser.getVideoUrls(
        videoInfo.aid, 
        videoInfo.pages[0].cid, 
        64  // 720P质量
      );
      
      if (!videoUrls || videoUrls.length === 0) {
        throw new Error('无法获取视频播放地址');
      }
      
      console.log('✅ 视频播放地址获取成功:', videoUrls.length > 0 ? videoUrls[0].url.substring(0, 100) + '...' : '无地址');
      
      // 准备分析数据 - 使用正确的URL结构
      const analysisData = {
        videoUrl: videoUrls[0].url,  // 使用第一个分段的URL
        title: videoInfo.title,
        owner: videoInfo.owner.name || videoInfo.owner,  // 兼容不同格式
        duration: videoInfo.duration,
        view: videoInfo.view,
        pages: videoInfo.pages.length
      };

      console.log('📦 准备发送分析请求:', analysisData);

      // 发送分析请求到后台
      console.log('📤 发送分析请求到后台...');
      const result = await this.sendMessageToBackground('ANALYZE_VIDEO', {
        videoData: analysisData,
        analysisType: 'general'
      });

      console.log('📥 收到后台响应:', result);

      if (result.success) {
        this.showAnalysisResult(result);
      } else {
        this.showError('分析失败', result.error || '未知错误');
      }
      
    } catch (error) {
      console.error('❌ 摘要生成失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
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

  addModalStyles(modal) {
    const style = document.createElement('style');
    style.className = 'stream-modal-styles';
    style.textContent = `
      .stream-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .stream-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }

      .stream-modal .modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        max-width: 700px;
        max-height: 85vh;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
        display: flex;
        flex-direction: column;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .stream-modal .modal-header {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px 16px 0 0;
      }

      .stream-modal .modal-header h3 {
        margin: 0;
        color: white;
        font-size: 20px;
        font-weight: 600;
      }

      .stream-modal .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        line-height: 1;
        padding: 0;
      }

      .stream-modal .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }

      .stream-modal .modal-body {
        padding: 24px;
        max-height: 500px;
        overflow-y: auto;
        flex: 1;
      }

      .stream-modal .loading-indicator {
        text-align: center;
        padding: 40px 20px;
      }

      .stream-modal .spinner {
        width: 50px;
        height: 50px;
        margin: 0 auto 20px;
        border: 4px solid #f3f4f6;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .stream-modal .loading-indicator p {
        color: #6b7280;
        font-size: 15px;
        margin: 0;
      }

      .stream-modal .stream-content {
        margin-top: 20px;
        line-height: 1.8;
        color: #374151;
        font-size: 15px;
      }

      .stream-modal .stream-content .chunk {
        padding: 12px;
        margin-bottom: 12px;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 3px solid #667eea;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .stream-modal .modal-footer {
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9fafb;
        border-radius: 0 0 16px 16px;
      }

      .stream-modal .status-badge {
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .stream-modal .status-badge.generating {
        background: #dbeafe;
        color: #1e40af;
      }

      .stream-modal .status-badge.generating::before {
        content: '';
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .stream-modal .status-badge.completed {
        background: #d1fae5;
        color: #065f46;
      }

      .stream-modal .status-badge.completed::before {
        content: '✓';
        font-weight: bold;
      }

      .stream-modal .copy-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }

      .stream-modal .copy-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .stream-modal .copy-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .stream-modal .copy-btn.copied {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
    `;
    document.head.appendChild(style);
  }

  bindModalEvents(modal) {
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // 点击遮罩关闭
    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', () => {
      this.closeModal();
    });

    // 复制按钮
    const copyBtn = modal.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.fullContent);
        copyBtn.textContent = '已复制!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '复制结果';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    });

    // ESC键关闭
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    modal._escapeHandler = handleEscape;
  }

  closeModal() {
    if (this.currentModal) {
      // 移除键盘事件监听
      if (this.currentModal._escapeHandler) {
        document.removeEventListener('keydown', this.currentModal._escapeHandler);
      }

      // 移除弹窗
      document.body.removeChild(this.currentModal);

      // 移除样式
      const style = document.querySelector('.stream-modal-styles');
      if (style) {
        document.head.removeChild(style);
      }

      this.currentModal = null;
      this.fullContent = '';
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