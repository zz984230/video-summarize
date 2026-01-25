// content.js - 内容脚本
class ContentScriptManager {
  constructor() {
    this.currentVideo = null;
    this.isAnalyzing = false;
    this.init();
  }

  init() {
    console.log('🚀 初始化内容脚本...');
    this.setupEventListeners();
    this.detectVideoPage();
    this.injectUI();
  }

  // 设置事件监听器
  setupEventListeners() {
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sender, sendResponse);
      return true;
    });

    // 监听页面变化
    this.setupPageChangeDetection();
    
    // 监听键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        this.analyzeCurrentVideo();
      }
    });
  }

  // 检测是否为视频页面
  detectVideoPage() {
    const isVideoPage = window.location.href.includes('bilibili.com/video/');
    
    if (isVideoPage) {
      console.log('📹 检测到B站视频页面');
      this.extractVideoInfo();
      this.showAnalysisButton();
    } else {
      console.log('❌ 当前页面不是B站视频页面');
      this.hideAnalysisButton();
    }
  }

  // 提取视频信息
  async extractVideoInfo() {
    try {
      console.log('🔍 正在提取视频信息...');
      
      // 等待页面加载完成
      await this.waitForPageLoad();
      
      // 获取BV号
      const bvid = this.extractBvid();
      if (!bvid) {
        console.error('❌ 无法提取BV号');
        return;
      }

      // 获取视频标题
      const title = this.extractTitle();
      
      // 获取UP主信息
      const owner = this.extractOwner();
      
      // 获取视频时长
      const duration = this.extractDuration();
      
      // 获取播放量
      const view = this.extractView();
      
      // 获取封面
      const cover = this.extractCover();

      this.currentVideo = {
        bvid,
        title,
        owner,
        duration,
        view,
        cover,
        url: window.location.href,
        timestamp: Date.now()
      };

      console.log('✅ 视频信息提取完成:', this.currentVideo);
      
      // 更新UI
      this.updateVideoInfoDisplay();
      
    } catch (error) {
      console.error('❌ 提取视频信息失败:', error);
    }
  }

  // 提取BV号
  extractBvid() {
    // 从URL中提取
    const urlMatch = window.location.href.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];

    // 从页面元素中提取
    const bvidElement = document.querySelector('meta[property="og:url"]');
    if (bvidElement) {
      const content = bvidElement.getAttribute('content');
      const match = content.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      if (match) return match[1];
    }

    // 从其他元素中提取
    const bvidElements = document.querySelectorAll('[data-bvid]');
    if (bvidElements.length > 0) {
      return bvidElements[0].getAttribute('data-bvid');
    }

    return null;
  }

  // 提取标题
  extractTitle() {
    // 从meta标签
    const titleMeta = document.querySelector('meta[property="og:title"]');
    if (titleMeta) return titleMeta.getAttribute('content').replace('_哔哩哔哩_bilibili', '').trim();

    // 从页面标题
    const pageTitle = document.title.replace('_哔哩哔哩_bilibili', '').trim();
    if (pageTitle) return pageTitle;

    // 从h1标签
    const h1Element = document.querySelector('h1');
    if (h1Element) return h1Element.textContent.trim();

    return '未知标题';
  }

  // 提取UP主信息
  extractOwner() {
    // 从meta标签
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) return authorMeta.getAttribute('content');

    // 从页面元素
    const ownerElements = [
      '.up-name',
      '.up-info .name',
      '[data-up-name]',
      '.up-detail .up-name'
    ];

    for (const selector of ownerElements) {
      const element = document.querySelector(selector);
      if (element) return element.textContent.trim();
    }

    return '未知UP主';
  }

  // 提取视频时长
  extractDuration() {
    // 从页面元素
    const durationElements = [
      '.duration',
      '.video-duration',
      '[data-duration]',
      '.bpx-player-ctrl-time-duration'
    ];

    for (const selector of durationElements) {
      const element = document.querySelector(selector);
      if (element) {
        const durationText = element.textContent.trim();
        return this.parseDurationToSeconds(durationText);
      }
    }

    return 0;
  }

  // 提取播放量
  extractView() {
    // 从页面元素
    const viewElements = [
      '.view',
      '.video-view',
      '[data-view]',
      '.video-data .view'
    ];

    for (const selector of viewElements) {
      const element = document.querySelector(selector);
      if (element) {
        const viewText = element.textContent.trim();
        return this.parseViewToNumber(viewText);
      }
    }

    return 0;
  }

  // 提取封面
  extractCover() {
    // 从meta标签
    const imageMeta = document.querySelector('meta[property="og:image"]');
    if (imageMeta) return imageMeta.getAttribute('content');

    // 从页面元素
    const coverElements = [
      '.video-cover img',
      '.cover img',
      '[data-cover]',
      '.bpx-player-cover-image'
    ];

    for (const selector of coverElements) {
      const element = document.querySelector(selector);
      if (element) return element.src;
    }

    return null;
  }

  // 等待页面加载
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve, { once: true });
      }
    });
  }

  // 设置页面变化检测
  setupPageChangeDetection() {
    // 监听URL变化
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.handleUrlChange(url);
      }
    }).observe(document, { subtree: true, childList: true });

    // 监听历史记录变化
    window.addEventListener('popstate', () => {
      this.handleUrlChange(location.href);
    });
  }

  // 处理URL变化
  handleUrlChange(url) {
    console.log('🔄 URL发生变化:', url);
    
    // 延迟检测，确保页面内容已更新
    setTimeout(() => {
      this.detectVideoPage();
    }, 1000);
  }

  // 注入UI
  injectUI() {
    // 创建分析按钮
    this.createAnalysisButton();
    
    // 创建结果显示面板
    this.createResultPanel();
    
    // 创建控制面板
    this.createControlPanel();
  }

  // 创建分析按钮
  createAnalysisButton() {
    const button = document.createElement('div');
    button.id = 'bilibili-summary-btn';
    button.innerHTML = `
      <div class="summary-btn-content">
        <span class="summary-btn-icon">🤖</span>
        <span class="summary-btn-text">AI摘要</span>
      </div>
    `;
    
    button.addEventListener('click', () => {
      this.analyzeCurrentVideo();
    });
    
    document.body.appendChild(button);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #bilibili-summary-btn {
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 10000;
        background: #00a1d6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 161, 214, 0.3);
        transition: all 0.3s ease;
        display: none;
      }
      
      #bilibili-summary-btn:hover {
        background: #0088b8;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 161, 214, 0.4);
      }
      
      #bilibili-summary-btn.analyzing {
        background: #ff9800;
        cursor: not-allowed;
      }
      
      .summary-btn-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .summary-btn-icon {
        font-size: 16px;
      }
      
      .summary-btn-text {
        font-size: 13px;
      }
    `;
    
    document.head.appendChild(style);
  }

  // 创建结果显示面板
  createResultPanel() {
    const panel = document.createElement('div');
    panel.id = 'bilibili-summary-panel';
    panel.innerHTML = `
      <div class="summary-panel-header">
        <h3>🤖 AI视频摘要</h3>
        <div class="summary-panel-controls">
          <button id="summary-copy-btn" class="summary-btn-small">复制</button>
          <button id="summary-close-btn" class="summary-btn-small">关闭</button>
        </div>
      </div>
      <div class="summary-panel-content">
        <div id="summary-loading" class="summary-loading">
          <div class="summary-spinner"></div>
          <p>正在分析视频内容...</p>
        </div>
        <div id="summary-result" class="summary-result" style="display: none;"></div>
        <div id="summary-error" class="summary-error" style="display: none;"></div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 添加事件监听
    document.getElementById('summary-copy-btn').addEventListener('click', () => {
      this.copySummaryResult();
    });
    
    document.getElementById('summary-close-btn').addEventListener('click', () => {
      this.hideSummaryPanel();
    });
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #bilibili-summary-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        width: 600px;
        max-width: 90vw;
        max-height: 70vh;
        display: none;
        overflow: hidden;
      }
      
      .summary-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #00a1d6;
        color: white;
      }
      
      .summary-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
      
      .summary-panel-controls {
        display: flex;
        gap: 8px;
      }
      
      .summary-btn-small {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .summary-btn-small:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .summary-panel-content {
        padding: 20px;
        max-height: calc(70vh - 60px);
        overflow-y: auto;
      }
      
      .summary-loading {
        text-align: center;
        padding: 40px;
      }
      
      .summary-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #00a1d6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }
      
      .summary-loading p {
        color: #666;
        font-size: 14px;
      }
      
      .summary-result {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      .summary-error {
        background: #fff2f0;
        border: 1px solid #ffccc7;
        border-radius: 8px;
        padding: 16px;
        color: #ff4d4f;
        font-size: 14px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }

  // 创建控制面板
  createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'bilibili-summary-control';
    panel.innerHTML = `
      <div class="summary-control-content">
        <div class="summary-control-item">
          <label>分析类型:</label>
          <select id="analysis-type-select">
            <option value="general">综合摘要</option>
            <option value="technical">技术分析</option>
            <option value="educational">教育价值</option>
            <option value="entertainment">娱乐分析</option>
            <option value="summary">简洁摘要</option>
          </select>
        </div>
        <div class="summary-control-item">
          <button id="quick-analyze-btn" class="summary-btn-primary">快速分析</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 添加事件监听
    document.getElementById('quick-analyze-btn').addEventListener('click', () => {
      const analysisType = document.getElementById('analysis-type-select').value;
      this.analyzeCurrentVideo(analysisType);
    });
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #bilibili-summary-control {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 12px;
        display: none;
      }
      
      .summary-control-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .summary-control-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .summary-control-item label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }
      
      .summary-control-item select {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .summary-btn-primary {
        background: #00a1d6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .summary-btn-primary:hover {
        background: #0088b8;
      }
    `;
    
    document.head.appendChild(style);
  }

  // 显示分析按钮
  showAnalysisButton() {
    const button = document.getElementById('bilibili-summary-btn');
    if (button) {
      button.style.display = 'block';
    }
    
    const controlPanel = document.getElementById('bilibili-summary-control');
    if (controlPanel) {
      controlPanel.style.display = 'block';
    }
  }

  // 隐藏分析按钮
  hideAnalysisButton() {
    const button = document.getElementById('bilibili-summary-btn');
    if (button) {
      button.style.display = 'none';
    }
    
    const controlPanel = document.getElementById('bilibili-summary-control');
    if (controlPanel) {
      controlPanel.style.display = 'none';
    }
    
    this.hideSummaryPanel();
  }

  // 更新视频信息显示
  updateVideoInfoDisplay() {
    if (!this.currentVideo) return;
    
    // 可以在这里添加更多UI更新逻辑
    console.log('📝 视频信息已更新:', this.currentVideo.title);
  }

  // 分析当前视频
  async analyzeCurrentVideo(analysisType = null) {
    if (this.isAnalyzing) {
      console.log('⚠️ 分析正在进行中...');
      return;
    }

    if (!this.currentVideo) {
      console.error('❌ 没有可用的视频信息');
      this.showError('请先等待视频信息加载完成');
      return;
    }

    try {
      this.isAnalyzing = true;
      this.showAnalyzingState(true);
      this.showSummaryPanel(true);
      
      console.log('🤖 开始分析视频:', this.currentVideo.title);
      
      // 向后台脚本发送分析请求
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoData: this.currentVideo,
        analysisType: analysisType || 'general'
      });
      
      if (response.success) {
        this.displayAnalysisResult(response.data);
      } else {
        throw new Error(response.error || '分析失败');
      }
      
    } catch (error) {
      console.error('❌ 分析失败:', error);
      this.showAnalysisError(error.message);
    } finally {
      this.isAnalyzing = false;
      this.showAnalyzingState(false);
    }
  }

  // 处理后台消息
  async handleBackgroundMessage(message, sender, sendResponse) {
    console.log('📨 收到后台消息:', message);

    try {
      switch (message.action) {
        case 'analyzeCurrentVideo':
          await this.analyzeCurrentVideo();
          sendResponse({ success: true });
          break;

        case 'analysisResult':
          this.displayAnalysisResult(message.result);
          sendResponse({ success: true });
          break;

        case 'analysisError':
          this.showAnalysisError(message.error);
          sendResponse({ success: true });
          break;

        case 'getCurrentVideoInfo':
          sendResponse({ success: true, data: this.currentVideo });
          break;

        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      console.error('❌ 处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 显示分析状态
  showAnalyzingState(analyzing) {
    const button = document.getElementById('bilibili-summary-btn');
    if (button) {
      if (analyzing) {
        button.classList.add('analyzing');
        button.querySelector('.summary-btn-text').textContent = '分析中...';
      } else {
        button.classList.remove('analyzing');
        button.querySelector('.summary-btn-text').textContent = 'AI摘要';
      }
    }
  }

  // 显示摘要面板
  showSummaryPanel(show) {
    const panel = document.getElementById('bilibili-summary-panel');
    if (panel) {
      if (show) {
        panel.style.display = 'block';
        document.getElementById('summary-loading').style.display = 'block';
        document.getElementById('summary-result').style.display = 'none';
        document.getElementById('summary-error').style.display = 'none';
      } else {
        panel.style.display = 'none';
      }
    }
  }

  // 隐藏摘要面板
  hideSummaryPanel() {
    this.showSummaryPanel(false);
  }

  // 显示分析结果
  displayAnalysisResult(result) {
    document.getElementById('summary-loading').style.display = 'none';
    document.getElementById('summary-result').style.display = 'block';
    document.getElementById('summary-error').style.display = 'none';
    
    const resultElement = document.getElementById('summary-result');
    resultElement.textContent = result.summary;
  }

  // 显示分析错误
  showAnalysisError(error) {
    document.getElementById('summary-loading').style.display = 'none';
    document.getElementById('summary-result').style.display = 'none';
    document.getElementById('summary-error').style.display = 'block';
    
    const errorElement = document.getElementById('summary-error');
    errorElement.textContent = `分析失败: ${error}`;
  }

  // 复制摘要结果
  copySummaryResult() {
    const resultElement = document.getElementById('summary-result');
    if (resultElement && resultElement.textContent) {
      navigator.clipboard.writeText(resultElement.textContent).then(() => {
        this.showSuccess('摘要已复制到剪贴板');
      }).catch(() => {
        this.showError('复制失败，请手动复制');
      });
    }
  }

  // 显示成功提示
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  // 显示错误提示
  showError(message) {
    this.showToast(message, 'error');
  }

  // 显示提示
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `summary-toast summary-toast-${type}`;
    toast.innerHTML = `
      <span class="summary-toast-icon">${type === 'success' ? '✅' : '❌'}</span>
      <span class="summary-toast-text">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .summary-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10002;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.3s ease;
      }
      
      .summary-toast-success {
        border-left: 4px solid #52c41a;
      }
      
      .summary-toast-error {
        border-left: 4px solid #ff4d4f;
      }
      
      .summary-toast-icon {
        font-size: 16px;
      }
      
      .summary-toast-text {
        font-size: 14px;
        color: #333;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // 自动移除
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 3000);
  }

  // 工具方法
  parseDurationToSeconds(durationText) {
    const parts = durationText.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }

  parseViewToNumber(viewText) {
    const num = parseFloat(viewText.replace(/[万,]/g, ''));
    if (viewText.includes('万')) {
      return Math.round(num * 10000);
    }
    return Math.round(num);
  }
}

// 初始化内容脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScriptManager();
  });
} else {
  new ContentScriptManager();
}