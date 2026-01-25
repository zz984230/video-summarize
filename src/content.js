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
    this.setupStreamListener();

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

      // 检查是否有当前视频信息
      if (!this.currentVideoInfo) {
        throw new Error('未找到视频信息，请刷新页面重试');
      }

      // 从DOM获取基本信息（快速）
      const title = this.getVideoTitle();
      const owner = this.getVideoOwner();

      console.log('📋 DOM信息:', { title, owner });

      // 获取视频播放地址（多模态API需要）
      console.log('🔍 获取视频播放地址...');
      const videoInfo = await this.parser.getVideoInfo(this.currentVideoInfo.bvid);
      const videoUrls = await this.parser.getVideoUrls(
        videoInfo.aid,
        videoInfo.pages[0].cid,
        64  // 720P质量
      );

      if (!videoUrls || videoUrls.length === 0) {
        throw new Error('无法获取视频播放地址');
      }

      console.log('✅ 视频地址获取成功');

      // 准备分析数据
      const videoData = {
        videoUrl: videoUrls[0].url,
        bvid: this.currentVideoInfo.bvid,
        pageUrl: window.location.href,
        title: title,
        owner: owner
      };

      console.log('📦 准备发送请求:', { title, hasVideoUrl: !!videoData.videoUrl });

      // 创建流式模态框
      this.currentModal = this.createStreamModal();
      document.body.appendChild(this.currentModal);

      // 初始化流式卡片渲染器
      this.fullContent = '';
      this.streamRenderer = new StreamCardRenderer(this.currentModal);

      // 设置按钮加载状态
      this.setButtonLoading(true);

      // 发送请求
      chrome.runtime.sendMessage({
        action: 'START_STREAM_ANALYSIS',
        data: {
          videoData: videoData,
          analysisType: 'summary'
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          this.onStreamError(chrome.runtime.lastError.message || '通信错误');
          this.setButtonLoading(false);
          return;
        }
        if (!response) {
          this.onStreamError('后台服务无响应');
          this.setButtonLoading(false);
          return;
        }
        if (!response.success) {
          this.onStreamError(response.error || '启动分析失败');
          this.setButtonLoading(false);
          return;
        }
        console.log('✅ 分析请求已发送');
      });

    } catch (error) {
      console.error('❌ 摘要生成失败:', error);
      this.showError('摘要生成失败', error.message);
    }
  }

  getVideoTitle() {
    const selectors = [
      'h1.video-title',
      '.video-title h1',
      '[data-title]',
      'h1'
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

  setButtonLoading(loading) {
    const button = document.querySelector('.bilibili-summary-btn');
    if (button) {
      button.disabled = loading;
      if (loading) {
        button.innerHTML = `
          <span class="btn-icon">⏳</span>
          <span class="btn-text">分析中...</span>
        `;
      } else {
        button.innerHTML = `
          <span class="btn-icon">🤖</span>
          <span class="btn-text">AI摘要</span>
        `;
      }
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
        margin-top: 16px;
        line-height: 1.8;
        color: #374151;
        font-size: 15px;
      }

      /* 卡片式布局样式 */
      .stream-modal .summary-card {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 12px;
        padding: 0;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-left: 4px solid #667eea;
        overflow: hidden;
        animation: cardSlideIn 0.3s ease;
      }

      @keyframes cardSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .stream-modal .summary-card:hover {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        transform: translateY(-2px);
        transition: all 0.2s ease;
      }

      .stream-modal .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .stream-modal .card-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .stream-modal .card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .stream-modal .card-body {
        padding: 16px 20px;
      }

      /* 不同章节类型使用不同边框色 */
      .stream-modal .summary-card[data-type="theme"] { border-left-color: #667eea; }
      .stream-modal .summary-card[data-type="content"] { border-left-color: #10b981; }
      .stream-modal .summary-card[data-type="points"] { border-left-color: #f59e0b; }
      .stream-modal .summary-card[data-type="conclusion"] { border-left-color: #8b5cf6; }
      .stream-modal .summary-card[data-type="suggestion"] { border-left-color: #06b6d4; }
      .stream-modal .summary-card[data-type="audience"] { border-left-color: #ec4899; }
      .stream-modal .summary-card[data-type="details"] { border-left-color: #f97316; }

      /* 流式状态样式 */
      .stream-modal .summary-card.streaming {
        position: relative;
      }

      .stream-modal .summary-card.streaming .card-header::after {
        content: '';
        position: absolute;
        top: 16px;
        right: 16px;
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        animation: streamingPulse 1.5s ease-in-out infinite;
      }

      @keyframes streamingPulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }

      .stream-modal .summary-card.complete .card-header::after {
        content: '✓';
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 14px;
        font-weight: bold;
        color: white;
        animation: checkmarkAppear 0.3s ease;
      }

      @keyframes checkmarkAppear {
        from {
          opacity: 0;
          transform: scale(0);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .stream-modal .card-paragraph {
        margin: 8px 0;
        line-height: 1.6;
        color: #495057;
      }

      .stream-modal .card-list-item {
        padding: 6px 0;
        padding-left: 24px;
        position: relative;
        color: #495057;
        line-height: 1.5;
      }

      .stream-modal .card-list-item::before {
        content: '•';
        position: absolute;
        left: 8px;
        color: #667eea;
        font-weight: bold;
      }

      /* 保留旧样式以兼容流式内容 */
      .stream-modal .formatted-content {
        animation: fadeIn 0.3s ease;
      }

      .stream-modal .content-block {
        margin-bottom: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        border-radius: 12px;
        border-left: 4px solid #667eea;
        animation: slideIn 0.3s ease;
      }

      .stream-modal .content-header {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e5e7eb;
      }

      .stream-modal .list-item {
        padding: 8px 12px;
        margin: 6px 0;
        background: white;
        border-radius: 8px;
        font-size: 14px;
        color: #4b5563;
        display: flex;
        align-items: flex-start;
      }

      .stream-modal .list-item::before {
        content: '•';
        color: #667eea;
        font-weight: bold;
        margin-right: 8px;
        font-size: 18px;
      }

      .stream-modal .text-line {
        padding: 8px 0;
        color: #4b5563;
        line-height: 1.8;
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

      // 重置按钮状态
      this.setButtonLoading(false);
    }
  }

  appendStreamContent(text) {
    if (!this.currentModal || !this.streamRenderer) {
      console.error('[appendStreamContent] No modal or renderer', {
        hasModal: !!this.currentModal,
        hasRenderer: !!this.streamRenderer
      });
      return;
    }

    console.log('[appendStreamContent] Received text:', text.substring(0, 100));

    // 移除加载动画
    const modalBody = this.currentModal.querySelector('.modal-body');
    const loadingEl = modalBody?.querySelector('.loading-indicator');
    if (loadingEl) {
      loadingEl.remove();
    }

    // 使用流式卡片渲染器处理内容
    this.streamRenderer.append(text);

    // 保存完整内容
    this.fullContent += text;

    // 改进的自动滚动 - 滚动到模态框底部
    this.autoScrollToContent();
  }

  autoScrollToContent() {
    if (!this.currentModal) return;

    const modalBody = this.currentModal.querySelector('.modal-body');
    if (!modalBody) return;

    // 平滑滚动到模态框内容区域的底部
    modalBody.scrollTo({
      top: modalBody.scrollHeight,
      behavior: 'smooth'
    });
  }

  appendFormattedText(container, text) {
    // 将文本按换行符分割并格式化
    const lines = text.split('\n');

    // 检查容器中是否已经有内容块
    let currentBlock = container.querySelector('.content-block:last-child');
    if (!currentBlock) {
      currentBlock = document.createElement('div');
      currentBlock.className = 'content-block';
      container.appendChild(currentBlock);
    }

    // 获取当前块中的最后一个文本节点
    let lastTextSpan = currentBlock.querySelector('.text-line:last-child');

    lines.forEach((line, index) => {
      if (line.trim() === '') {
        // 空行，创建新的内容块
        if (currentBlock && currentBlock.textContent.trim() !== '') {
          currentBlock = document.createElement('div');
          currentBlock.className = 'content-block';
          container.appendChild(currentBlock);
        }
        lastTextSpan = null;
      } else {
        // 检查是否是列表项或标题
        const trimmedLine = line.trim();
        const isListItem = /^[\d\-\*\•]\s/.test(trimmedLine) || /^[\u4e00-\u9fa5]、/.test(trimmedLine);
        const isHeader = /^#+\s/.test(trimmedLine) || /^[一二三四五六七八九十][、\.]\s/.test(trimmedLine);

        if (isListItem) {
          const li = document.createElement('div');
          li.className = 'list-item';
          li.textContent = line;
          currentBlock.appendChild(li);
          lastTextSpan = null;
        } else if (isHeader) {
          const header = document.createElement('div');
          header.className = 'content-header';
          header.textContent = line;
          currentBlock.appendChild(header);
          lastTextSpan = null;
        } else {
          if (!lastTextSpan) {
            lastTextSpan = document.createElement('div');
            lastTextSpan.className = 'text-line';
            currentBlock.appendChild(lastTextSpan);
          }
          lastTextSpan.textContent += (lastTextSpan.textContent ? ' ' : '') + line;
        }
      }
    });
  }

  onStreamComplete(fullContent) {
    if (!this.currentModal) return;

    // 刷新流式渲染器的缓冲区，完成所有卡片
    if (this.streamRenderer) {
      this.streamRenderer.flush();
    }

    // 移除加载动画（从modal-body查找）
    const modalBody = this.currentModal.querySelector('.modal-body');
    if (modalBody) {
      const loadingEl = modalBody.querySelector('.loading-indicator');
      if (loadingEl) {
        loadingEl.remove();
      }
    }

    // 重置按钮状态
    this.setButtonLoading(false);

    // 更新状态徽章
    const statusBadge = this.currentModal.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.classList.remove('generating');
      statusBadge.classList.add('completed');
      statusBadge.textContent = '生成完成';
    }

    // 启用复制按钮
    const copyBtn = this.currentModal.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.disabled = false;
    }

    // 更新标题
    const title = this.currentModal.querySelector('.modal-header h3');
    if (title) {
      title.textContent = '🎬 视频分析完成';
    }

    // 保存到历史记录
    this.saveToHistory(fullContent);
  }

  onStreamError(error) {
    if (!this.currentModal) return;

    // 重置按钮状态
    this.setButtonLoading(false);

    // 更新状态徽章
    const statusBadge = this.currentModal.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.classList.remove('generating');
      statusBadge.style.background = '#fee2e2';
      statusBadge.style.color = '#991b1b';
      statusBadge.textContent = '生成失败';
    }

    // 移除加载动画（从modal-body中查找）
    const modalBody = this.currentModal.querySelector('.modal-body');
    if (modalBody) {
      const loadingEl = modalBody.querySelector('.loading-indicator');
      if (loadingEl) {
        loadingEl.remove();
      }
    }

    // 显示错误信息
    const contentEl = this.currentModal.querySelector('#streamContent');
    if (contentEl) {
      // 清空内容
      contentEl.innerHTML = '';

      // 添加错误信息
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText = `
        padding: 16px;
        background: #fee2e2;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        color: #991b1b;
        margin-top: 16px;
      `;
      const errorMessage = typeof error === 'string' ? error : (error?.message || '未知错误');
      errorDiv.innerHTML = `
        <strong>❌ 分析失败</strong><br>
        ${this.escapeHtml(errorMessage)}
      `;
      contentEl.appendChild(errorDiv);
    }

    // 更新标题
    const title = this.currentModal.querySelector('.modal-header h3');
    if (title) {
      title.textContent = '🎬 视频分析失败';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async saveToHistory(content) {
    try {
      if (!this.currentVideoInfo) {
        console.warn('没有视频信息，跳过历史记录保存');
        return;
      }

      const historyItem = {
        id: Date.now(),
        bvid: this.currentVideoInfo.bvid,
        title: this.currentVideoInfo.title,
        owner: this.currentVideoInfo.owner,
        duration: this.currentVideoInfo.duration,
        url: this.currentVideoInfo.url,
        summary: content,
        createdAt: new Date().toISOString()
      };

      // 从存储中获取现有历史记录
      const result = await this.sendMessageToBackground('GET_HISTORY');
      const history = result.history || [];

      // 添加新记录到开头
      history.unshift(historyItem);

      // 限制历史记录数量（最多保存100条）
      const limitedHistory = history.slice(0, 100);

      // 保存到存储
      await this.sendMessageToBackground('SAVE_HISTORY', { history: limitedHistory });

      console.log('✅ 历史记录保存成功:', historyItem);
    } catch (error) {
      console.error('❌ 保存历史记录失败:', error);
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

  setupStreamListener() {
    const self = this;
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'STREAM_CHUNK':
          self.appendStreamContent(message.data.content || '');
          break;
        case 'STREAM_END':
          self.onStreamComplete(message.data.content);
          break;
        case 'STREAM_ERROR':
          self.onStreamError(message.data.error);
          break;
        case 'DEBUG_MESSAGE':
          self.handleDebugMessage(message.data.message);
          break;
      }
      return true;
    });
  }

  handleDebugMessage(message) {
    const debugEl = document.querySelector('#bilibili-debug-info');
    if (debugEl) {
      const [key, ...valueParts] = message.split(': ');
      const value = valueParts.join(': ') || 'true';
      debugEl.setAttribute(`data-${key}`, value);
      console.log(`[DEBUG] ${key}: ${value}`);
    }
  }
}

// 流式卡片渲染器
class StreamCardRenderer {
  constructor(modal) {
    this.modal = modal;
    this.container = modal.querySelector('#streamContent');
    this.buffer = '';
    this.currentCard = null;
    this.currentTitle = null;
    this.currentContent = '';
    this.cardCount = 0;
  }

  append(text) {
    console.log('[StreamCardRenderer] append:', text.substring(0, 100));
    this.buffer += text;
    this.processBuffer();
  }

  processBuffer() {
    // 按双换行分割段落
    while (this.buffer.includes('\n\n')) {
      const parts = this.buffer.split('\n\n');
      const section = parts[0];
      this.buffer = parts.slice(1).join('\n\n');

      console.log('[StreamCardRenderer] processing section:', section.substring(0, 100));
      this.createOrUpdateCard(section);
    }
  }

  createOrUpdateCard(section) {
    const trimmed = section.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    console.log('[StreamCardRenderer] title:', title, 'content:', content.substring(0, 50));

    // 新标题 = 新卡片
    if (title !== this.currentTitle) {
      // 完成之前的卡片
      this.finalizeCurrentCard();

      // 创建新卡片
      this.currentTitle = title;
      this.currentContent = content;
      this.currentCard = this.createNewCard(title);
      this.container.appendChild(this.currentCard);
      this.cardCount++;

      // 立即更新内容（如果有）
      if (content) {
        this.updateCardContent();
      }
    } else {
      // 同一卡片，追加内容
      if (content) {
        this.currentContent += '\n' + content;
        this.updateCardContent();
      }
    }
  }

  createNewCard(title) {
    const card = document.createElement('div');
    card.className = 'summary-card streaming';
    card.setAttribute('data-type', this.getCardType(title));

    const icon = this.getIconForTitle(title);

    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">${icon}</span>
        <h4 class="card-title">${this.escapeHtml(title)}</h4>
      </div>
      <div class="card-body">
        <div class="card-streaming-content"></div>
      </div>
    `;

    return card;
  }

  updateCardContent() {
    if (!this.currentCard) return;

    const body = this.currentCard.querySelector('.card-body');
    if (body) {
      body.innerHTML = this.formatText(this.currentContent);
    }
  }

  finalizeCurrentCard() {
    if (this.currentCard) {
      this.currentCard.classList.remove('streaming');
      this.currentCard.classList.add('complete');
    }
  }

  flush() {
    // 处理缓冲区剩余内容
    if (this.buffer.trim()) {
      this.createOrUpdateCard(this.buffer);
      this.finalizeCurrentCard();
      this.buffer = '';
    }
  }

  getCardType(title) {
    const t = title.toLowerCase();
    if (t.includes('主题') || t.includes('核心') || t.includes('概览')) return 'theme';
    if (t.includes('内容') || t.includes('分析') || t.includes('详情')) return 'content';
    if (t.includes('观点') || t.includes('要点') || t.includes('关键')) return 'points';
    if (t.includes('结论') || t.includes('总结') || t.includes('评价')) return 'conclusion';
    if (t.includes('建议') || t.includes('推荐')) return 'suggestion';
    if (t.includes('受众') || t.includes('适合')) return 'audience';
    if (t.includes('细节') || t.includes('说明')) return 'details';
    return 'default';
  }

  getIconForTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('主题') || t.includes('核心') || t.includes('概览')) return '🎯';
    if (t.includes('内容') || t.includes('分析') || t.includes('详情')) return '📋';
    if (t.includes('观点') || t.includes('要点') || t.includes('关键') || t.includes('信息')) return '⭐';
    if (t.includes('结论') || t.includes('总结') || t.includes('评价')) return '✅';
    if (t.includes('建议') || t.includes('推荐')) return '💡';
    if (t.includes('受众') || t.includes('适合') || t.includes('对象')) return '👥';
    if (t.includes('细节') || t.includes('说明')) return '📌';
    return '📌';
  }

  formatText(text) {
    if (!text) return '';

    const lines = text.split('\n');

    const html = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // 列表项 - 扩展正则表达式以匹配更多格式
      // 匹配: "1. ", "1、", "- ", "* ", "• ", "①", "⑴" 等
      if (/^[\d\-\*\•\①②③④⑤⑥⑦⑧⑨⑩]\s/.test(trimmed) ||
          /^[\u4e00-\u9fa5\u3000-\u303f][\u4e00-\u9fa5\d\.、]\s/.test(trimmed)) {
        // 移除列表标记前缀，只保留内容
        const content = trimmed.replace(/^[\d\-\*\•\①②③④⑤⑥⑦⑧⑨⑩]\s+/, '')
                           .replace(/^[\u4e00-\u9fa5\u3000-\u303f][\u4e00-\u9fa5\d\.、]\s+/, '');
        return `<li class="card-list-item">${this.escapeHtml(content.trim())}</li>`;
      }

      // 普通段落
      return `<p class="card-paragraph">${this.escapeHtml(trimmed)}</p>`;
    }).filter(Boolean).join('');

    return html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化内容脚本
if (window.location.hostname.includes('bilibili.com')) {
  new BilibiliContentScript();
}