# 流式视频摘要功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现B站视频摘要的流式展示功能，让用户实时看到AI生成摘要的过程。

**架构：** Content Script与Background Service之间建立流式通信机制，通过SSE解析智谱GLM-4.6V-Flash API的流式响应，逐块推送到前端显示。

**Tech Stack：** Chrome Manifest V3, Server-Sent Events (SSE), 智谱 GLM-4.6V-Flash API

---

## 前置准备

### Task 0: 创建功能分支并验证环境

**Files:**
- 无

**Step 1: 创建功能分支**

```bash
git checkout -b feature/streaming-summary
```

**Step 2: 验证开发环境**

```bash
# 检查Node版本
node --version  # 应该 >= 16

# 安装依赖（如果需要）
npm install

# 验证构建
npm run build
```

Expected: 构建成功，生成 `dist/` 目录

**Step 3: 确认当前状态**

```bash
git status
```

Expected: 工作目录干净

---

## Phase 1: 更新API配置

### Task 1: 更新默认API配置为智谱

**Files:**
- Modify: `src/options.js`

**Step 1: 修改默认配置**

找到 `loadConfiguration()` 方法，更新默认值：

```javascript
async loadConfiguration() {
  try {
    this.showStatus('正在加载配置...', 'loading');

    // 从存储中获取配置
    const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId']);

    this.apiKey = result.apiKey || '';
    this.apiUrl = result.apiUrl || 'https://open.bigmodel.cn/api/paas/v4';  // 更新
    this.modelId = result.modelId || 'glm-4.6v-flash';  // 更新

    // 填充表单
    const apiKeyInput = document.getElementById('apiKey');
    const apiUrlInput = document.getElementById('apiUrl');
    const modelIdInput = document.getElementById('modelId');

    if (apiKeyInput) apiKeyInput.value = this.apiKey;
    if (apiUrlInput) apiUrlInput.value = this.apiUrl;
    if (modelIdInput) modelIdInput.value = this.modelId;

    console.log('✅ 配置已加载');
    this.hideStatus();
  } catch (error) {
    console.error('❌ 配置加载失败:', error);
    this.showError('配置加载失败', error.message);
  }
}
```

**Step 2: 构建验证**

```bash
npm run build
```

Expected: 构建成功，无错误

**Step 3: 提交**

```bash
git add src/options.js
git commit -m "feat: update default API config to Zhipu GLM-4.6V-Flash"
```

---

## Phase 2: Content Script 改造

### Task 2: 添加流式弹窗创建方法

**Files:**
- Modify: `src/content.js`

**Step 1: 在构造函数中初始化新属性**

在 `BilibiliContentScript` 类的构造函数中添加：

```javascript
constructor() {
  this.parser = new BilibiliVideoParser();
  this.currentVideoUrl = null;
  this.isVideoPage = false;

  // 新增：流式相关状态
  this.currentModal = null;
  this.fullContent = '';

  this.init();
}
```

**Step 2: 添加 createStreamModal 方法**

在 `BilibiliContentScript` 类中添加以下方法（插入到 `addSummaryButton` 方法之后）：

```javascript
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

  // 添加样式
  this.addModalStyles(modal);

  // 绑定事件
  this.bindModalEvents(modal);

  return modal;
}
```

**Step 3: 添加样式方法**

```javascript
addModalStyles(modal) {
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
    animation: slideIn 0.3s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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
    }
    .stream-modal .modal-content {
      position: relative;
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    .stream-modal .modal-header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stream-modal .modal-header h3 {
      margin: 0;
      color: #333;
    }
    .stream-modal .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }
    .stream-modal .modal-body {
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
    }
    .stream-modal .loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: #667eea;
    }
    .stream-modal .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .stream-modal .stream-content {
      line-height: 1.8;
      color: #333;
      white-space: pre-wrap;
      animation: fadeIn 0.5s ease-in;
    }
    .stream-modal .modal-footer {
      padding: 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stream-modal .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .stream-modal .status-badge.generating {
      background: #fff3cd;
      color: #856404;
    }
    .stream-modal .status-badge.completed {
      background: #d4edda;
      color: #155724;
    }
    .stream-modal .status-badge.error {
      background: #f8d7da;
      color: #721c24;
    }
    .stream-modal .copy-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    .stream-modal .copy-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    @media (max-width: 480px) {
      .stream-modal .modal-content {
        width: 95%;
        padding: 15px;
      }
      .stream-modal .modal-body {
        font-size: 14px;
      }
    }
  `;

  document.head.appendChild(style);
}
```

**Step 4: 添加事件绑定方法**

```javascript
bindModalEvents(modal) {
  const closeBtn = modal.querySelector('.close-btn');
  const overlay = modal.querySelector('.modal-overlay');
  const copyBtn = modal.querySelector('.copy-btn');

  const closeHandler = () => {
    this.closeModal();
  };

  closeBtn.addEventListener('click', closeHandler);
  overlay.addEventListener('click', closeHandler);

  copyBtn.addEventListener('click', () => {
    const content = modal.querySelector('#streamContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
      alert('结果已复制到剪贴板');
    });
  });

  // 键盘事件 - 需要处理重复绑定
  if (!this.escapeHandler) {
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeModal();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }
}
```

**Step 5: 添加关闭弹窗方法**

```javascript
closeModal() {
  if (this.currentModal) {
    // 移除DOM
    const modalEl = document.querySelector('.stream-modal');
    if (modalEl) {
      document.body.removeChild(modalEl);
    }

    // 移除样式
    const styleEl = document.querySelector('style[data-modal-style="stream"]');
    if (styleEl) {
      document.head.removeChild(styleEl);
    }

    this.currentModal = null;
  }

  // 通知后台中止流式请求
  this.sendMessageToBackground('CANCEL_STREAM', {});

  this.resetButtonState();
}
```

**Step 6: 构建验证**

```bash
npm run build
```

**Step 7: 提交**

```bash
git add src/content.js
git commit -m "feat: add streaming modal creation methods to content script"
```

---

### Task 3: 添加流式内容处理方法

**Files:**
- Modify: `src/content.js`

**Step 1: 添加追加内容方法**

```javascript
appendStreamContent(text) {
  if (!this.currentModal) return;

  const contentEl = this.currentModal.querySelector('#streamContent');

  // 移除加载动画
  const loadingEl = contentEl.querySelector('.loading-indicator');
  if (loadingEl) {
    loadingEl.remove();
  }

  // 追加内容
  const span = document.createElement('span');
  span.textContent = text;
  contentEl.appendChild(span);

  // 保存完整内容
  this.fullContent += text;

  // 自动滚动到底部（检测用户是否在滚动）
  const isNearBottom = contentEl.scrollHeight - contentEl.scrollTop - contentEl.clientHeight < 50;
  if (isNearBottom) {
    contentEl.scrollTop = contentEl.scrollHeight;
  }
}
```

**Step 2: 添加流式完成处理方法**

```javascript
onStreamComplete(fullContent) {
  if (!this.currentModal) return;

  const statusBadge = this.currentModal.querySelector('.status-badge');
  const copyBtn = this.currentModal.querySelector('.copy-btn');
  const headerTitle = this.currentModal.querySelector('.modal-header h3');

  if (statusBadge) {
    statusBadge.className = 'status-badge completed';
    statusBadge.textContent = '已完成';
  }

  if (copyBtn) {
    copyBtn.disabled = false;
  }

  if (headerTitle) {
    headerTitle.textContent = '🎬 视频分析结果';
  }

  this.resetButtonState();

  // 保存到历史记录
  this.saveToHistory(fullContent || this.fullContent);
}
```

**Step 3: 添加流式错误处理方法**

```javascript
onStreamError(error) {
  if (!this.currentModal) return;

  const contentEl = this.currentModal.querySelector('#streamContent');
  const statusBadge = this.currentModal.querySelector('.status-badge');
  const headerTitle = this.currentModal.querySelector('.modal-header h3');

  // 移除加载动画
  const loadingEl = contentEl.querySelector('.loading-indicator');
  if (loadingEl) loadingEl.remove();

  // 显示错误
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; text-align: center;';
  errorDiv.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
    <p style="color: #dc3545; margin: 0;">${this.escapeHtml(error)}</p>
    <button onclick="location.reload()" style="
      margin-top: 15px;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    ">重新加载</button>
  `;
  contentEl.appendChild(errorDiv);

  if (statusBadge) {
    statusBadge.className = 'status-badge error';
    statusBadge.textContent = '分析失败';
  }

  if (headerTitle) {
    headerTitle.textContent = '🎬 分析失败';
  }

  this.resetButtonState();
}

escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Step 4: 修改保存历史方法（支持流式完成）**

如果已存在 `saveToHistory` 方法，更新它：

```javascript
async saveToHistory(content) {
  try {
    const result = await chrome.storage.local.get(['summaryHistory']);
    const history = result.summaryHistory || [];

    history.unshift({
      title: this.currentVideoInfo?.title || '未知标题',
      summary: content,
      date: new Date().toLocaleString(),
      url: window.location.href
    });

    // 限制历史记录数量
    if (history.length > 50) {
      history.splice(50);
    }

    await chrome.storage.local.set({ summaryHistory: history });
    console.log('✅ 历史记录已保存');
  } catch (error) {
    console.error('❌ 保存历史记录失败:', error);
  }
}
```

**Step 5: 添加页面卸载监听**

在构造函数中添加：

```javascript
constructor() {
  // ... 现有代码

  // 监听页面卸载，清理资源
  window.addEventListener('beforeunload', () => {
    if (this.currentModal) {
      this.sendMessageToBackground('CANCEL_STREAM', {});
    }
  });
}
```

**Step 6: 构建验证**

```bash
npm run build
```

**Step 7: 提交**

```bash
git add src/content.js
git commit -m "feat: add streaming content handling methods"
```

---

### Task 4: 设置流式消息监听器

**Files:**
- Modify: `src/content.js`

**Step 1: 添加流式消息监听方法**

```javascript
setupStreamListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'STREAM_CHUNK':
        this.appendStreamContent(request.data.content);
        break;
      case 'STREAM_END':
        this.onStreamComplete(request.data.fullContent);
        break;
      case 'STREAM_ERROR':
        this.onStreamError(request.data.error);
        break;
      default:
        // 其他消息类型不处理
        break;
    }
    return true; // 保持消息通道开放
  });
}
```

**Step 2: 在构造函数中调用监听器设置**

```javascript
constructor() {
  this.parser = new BilibiliVideoParser();
  this.currentVideoUrl = null;
  this.isVideoPage = false;
  this.currentModal = null;
  this.fullContent = '';

  this.init();

  // 设置流式消息监听器
  this.setupStreamListener();

  // 页面卸载监听
  window.addEventListener('beforeunload', () => {
    if (this.currentModal) {
      this.sendMessageToBackground('CANCEL_STREAM', {});
    }
  });
}
```

**Step 3: 构建验证**

```bash
npm run build
```

**Step 4: 提交**

```bash
git add src/content.js
git commit -m "feat: add streaming message listener"
```

---

### Task 5: 修改按钮点击处理为流式模式

**Files:**
- Modify: `src/content.js`

**Step 1: 重写 onSummaryButtonClick 方法**

找到现有的 `onSummaryButtonClick` 方法，替换为：

```javascript
async onSummaryButtonClick() {
  try {
    console.log('🔄 点击AI摘要按钮，开始流式分析...');

    // 立即创建弹窗，显示加载状态
    const modal = this.createStreamModal();
    document.body.appendChild(modal);
    this.currentModal = modal;

    // 发起流式分析请求
    await this.sendMessageToBackground('START_STREAM_ANALYSIS', {
      videoData: this.currentVideoInfo,
      analysisType: 'general'
    });

    console.log('✅ 流式分析请求已发送');
  } catch (error) {
    console.error('❌ 启动流式分析失败:', error);
    if (this.currentModal) {
      this.onStreamError(error.message);
    } else {
      this.showError('启动失败', error.message);
    }
  }
}
```

**Step 2: 移除或注释旧的 showAnalysisResult 方法调用**

由于不再需要旧的显示结果方式，可以删除 `showAnalysisResult` 方法，或者在方法开头添加检查：

```javascript
showAnalysisResult(result) {
  // 流式模式下不再使用此方法
  console.warn('showAnalysisResult 已废弃，使用流式模式');
}
```

**Step 3: 更新 showLoadingState 方法**

由于弹窗立即创建，`showLoadingState` 可以简化：

```javascript
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
```

**Step 4: 构建验证**

```bash
npm run build
```

**Step 5: 提交**

```bash
git add src/content.js
git commit -m "feat: modify button click to use streaming mode"
```

---

## Phase 3: Background Service 改造

### Task 6: 添加流式处理基础设施

**Files:**
- Modify: `src/background.js`

**Step 1: 在构造函数中添加流式状态**

```javascript
class BackgroundService {
  constructor() {
    this.parser = new BilibiliVideoParser();
    this.analysisService = new MultimodalAnalysisService();

    // 新增：流式处理状态
    this.currentStreamReader = null;
    this.activeTabId = null;

    this.init();
  }
```

**Step 2: 添加超时控制方法**

```javascript
clearStreamTimeout(timeoutId) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}
```

**Step 3: 添加中止流式方法**

```javascript
cancelStream() {
  if (this.currentStreamReader) {
    try {
      this.currentStreamReader.cancel();
      console.log('✅ 流式请求已中止');
    } catch (e) {
      console.warn('中止流式请求时出错:', e);
    }
    this.currentStreamReader = null;
  }
  this.activeTabId = null;
}
```

**Step 4: 添加时长格式化方法**

```javascript
formatDuration(seconds) {
  if (!seconds) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

**Step 5: 添加构建提示词方法**

```javascript
buildPrompt(videoData, analysisType) {
  const baseInfo = {
    title: videoData.title || '未知标题',
    owner: videoData.owner || '未知作者',
    duration: this.formatDuration(videoData.duration || 0),
    view: videoData.view || 0
  };

  // 简化版提示词
  return `请详细分析这个视频的内容。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${baseInfo.duration}，播放量${baseInfo.view}。请提供：
1. 视频的主要内容摘要
2. 关键信息和要点
3. 视频的结构和逻辑
4. 适合观看的受众群体
5. 内容的价值和意义`;
}
```

**Step 6: 在 handleMessage 中添加新消息类型**

在 `handleMessage` 方法的 switch 语句中添加：

```javascript
async handleMessage(request, sender, sendResponse) {
  try {
    console.log('📨 收到消息:', request.action);

    switch (request.action) {
      // ... 现有 case
      case 'PARSE_VIDEO':
        return await this.parseVideo(request.data, sendResponse);
      case 'ANALYZE_VIDEO':
        return await this.analyzeVideo(request.data, sendResponse);
      case 'VIDEO_DETECTED':
        console.log('📹 检测到视频页面:', request.data.videoInfo?.title || '未知标题');
        sendResponse({ success: true, message: '视频检测成功' });
        return;
      case 'GET_STORAGE':
        return await this.getStorage(request.key, sendResponse);
      case 'SET_STORAGE':
        return await this.setStorage(request.key, request.value, sendResponse);
      case 'TEST_API_KEY':
        return await this.testApiKey(request.apiKey, sendResponse);

      // 新增：流式分析相关
      case 'START_STREAM_ANALYSIS':
        return await this.handleStreamAnalysis(request, sender);
      case 'CANCEL_STREAM':
        this.cancelStream();
        sendResponse({ success: true });
        return;

      default:
        console.warn('⚠️ 未知的消息类型:', request.action);
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    console.error('❌ 消息处理错误:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // 保持消息通道开放
}
```

**Step 7: 构建验证**

```bash
npm run build
```

**Step 8: 提交**

```bash
git add src/background.js
git commit -m "feat: add streaming infrastructure to background service"
```

---

### Task 7: 实现流式分析主逻辑

**Files:**
- Modify: `src/background.js`

**Step 1: 实现 handleStreamAnalysis 方法**

```javascript
async handleStreamAnalysis(request, sender) {
  let timeoutId = null;

  try {
    const { videoData, analysisType } = request.data;
    this.activeTabId = sender.tab.id;

    // 设置超时控制（60秒）
    timeoutId = setTimeout(() => {
      this.cancelStream();
      chrome.tabs.sendMessage(this.activeTabId, {
        action: 'STREAM_ERROR',
        data: { error: '请求超时（60秒），请重试' }
      });
    }, 60000);

    // 获取API配置
    const result = await this.getStorage(['apiKey', 'apiUrl', 'modelId']);
    const apiKey = result.apiKey;
    const apiUrl = result.apiUrl || 'https://open.bigmodel.cn/api/paas/v4';
    const modelId = result.modelId || 'glm-4.6v-flash';

    if (!apiKey) {
      clearTimeout(timeoutId);
      throw new Error('请先在设置页面配置API密钥');
    }

    console.log('🔍 开始获取视频详细信息...');

    // 获取视频播放地址
    const videoInfo = await this.parser.getVideoInfo(videoData.bvid);
    const videoUrls = await this.parser.getVideoUrls(
      videoInfo.aid,
      videoInfo.pages[0].cid,
      64  // 720P
    );

    if (!videoUrls || videoUrls.length === 0) {
      clearTimeout(timeoutId);
      throw new Error('无法获取视频播放地址');
    }

    console.log('✅ 视频播放地址获取成功');

    // 构建请求体
    const requestBody = {
      model: modelId,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'video_url',
            video_url: { url: videoUrls[0].url }
          },
          {
            type: 'text',
            text: this.buildPrompt(videoData, analysisType)
          }
        ]
      }],
      stream: true,
      thinking: { type: 'enabled' }
    };

    console.log('📤 发起流式API请求...');

    // 发起流式请求
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errorText = await response.text();
      throw new Error(`API错误 (${response.status}): ${errorText}`);
    }

    console.log('✅ API连接成功，开始解析SSE流...');

    // 解析SSE流
    await this.parseSSEStream(response, sender.tab.id);

    clearTimeout(timeoutId);
    console.log('✅ 流式分析完成');

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ 流式分析失败:', error);

    if (this.activeTabId) {
      chrome.tabs.sendMessage(this.activeTabId, {
        action: 'STREAM_ERROR',
        data: { error: error.message }
      }).catch(e => {
        console.warn('发送错误消息失败:', e);
      });
    }
  }
}
```

**Step 2: 构建`

```bash
npm run build
```

**Step 3: 提交**

```bash
git add src/background.js
git commit -m "feat: implement main streaming analysis logic"
```

---

### Task 8: 实现SSE流解析

**Files:**
- Modify: `src/background.js`

**Step 1: 实现 parseSSEStream 方法**

```javascript
async parseSSEStream(response, tabId) {
  const reader = response.body.getReader();
  this.currentStreamReader = reader;
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('✅ SSE流读取完成');
        break;
      }

      // 解码并处理数据
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          // 检查结束标记
          if (data === '[DONE]') {
            console.log('✅ 收到流式结束标记');
            chrome.tabs.sendMessage(tabId, {
              action: 'STREAM_END',
              data: { fullContent }
            });
            return;
          }

          // 跳过空行和注释
          if (!data || data.startsWith(':')) {
            continue;
          }

          try {
            // 解析JSON
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;

            // 处理内容
            if (delta?.content) {
              fullContent += delta.content;

              // 发送到content script
              chrome.tabs.sendMessage(tabId, {
                action: 'STREAM_CHUNK',
                data: { content: delta.content, isThinking: false }
              }).catch(e => {
                console.warn('发送chunk失败:', e);
              });
            }

            // 思考内容不发送到前端
            if (delta?.reasoning_content) {
              console.log('💭 思考内容（不展示）:', delta.reasoning_content.substring(0, 50) + '...');
            }

          } catch (e) {
            console.warn('解析SSE chunk失败:', data, e);
            // 继续处理下一个chunk
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('✅ 流式请求已由用户中止');
    } else {
      console.error('❌ SSE流解析错误:', error);
      throw error;
    }
  } finally {
    this.currentStreamReader = null;
    this.activeTabId = null;
  }
}
```

**Step 2: 构建**

```bash
npm run build
```

**Step 3: 提交**

```bash
git add src/background.js
git commit -m "feat: implement SSE stream parsing"
```

---

## Phase 4: 测试与验证

### Task 9: 手动测试流程

**Files:**
- 无

**Step 1: 加载扩展到Chrome**

```bash
npm run build
```

在Chrome中：
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/` 目录

**Step 2: 配置API密钥**

1. 点击扩展图标
2. 打开设置页面
3. 输入智谱API密钥
4. 点击"保存配置"

**Step 3: 测试正常流程**

1. 访问任意B站视频页面 (https://www.bilibili.com/video/BV...)
2. 点击"AI摘要"按钮
3. 观察：
   - 弹窗立即弹出
   - 显示加载动画
   - 内容逐步显示
   - 状态变为"已完成"

**Step 4: 测试错误场景**

1. 清空API密钥
2. 点击"AI摘要"按钮
3. 应显示"请先配置API密钥"错误

**Step 5: 测试中途关闭**

1. 开始流式分析
2. 在生成过程中点击关闭按钮
3. 弹窗关闭，无错误提示

**Step 6: 检查控制台日志**

打开Chrome DevTools Console，检查：
- 无JavaScript错误
- 有预期的console.log输出

**Step 7: 提交测试文档（可选）**

如果需要记录测试结果：

```bash
echo "# 手动测试记录

$(date): 流式功能测试

## 测试环境
- Chrome版本: $(chrome --version)
- 操作系统: $(uname -a)

## 测试结果
- ✓ 正常流程
- ✓ 错误处理
- ✓ 中途关闭

## 问题描述
（记录发现的问题）
" > test-results.md
```

---

## Phase 5: 清理与优化

### Task 10: 移除废弃的multimodal-analysis服务

**Files:**
- Delete: `src/services/multimodal-analysis.js`
- Modify: `src/background.js`

**Step 1: 从 background.js 中移除引用**

在 `background.js` 顶部删除或注释：

```javascript
// import { MultimodalVideoParser } from './services/multimodal-analysis.js';
```

从构造函数中删除：

```javascript
constructor() {
  // this.parser = new BilibiliVideoParser();
  // this.analysisService = new MultimodalAnalysisService();
  // ...
}
```

**Step 2: 删除服务文件**

```bash
rm src/services/multimodal-analysis.js
```

**Step 3: 构建**

```bash
npm run build
```

**Step 4: 提交**

```bash
git add src/background.js
git rm src/services/multimodal-analysis.js
git commit -m "refactor: remove deprecated multimodal-analysis service"
```

---

### Task 11: 更新webpack配置（如果需要）

**Files:**
- Check: `webpack.config.js`

**Step 1: 检查webpack配置**

确认 `multimodal-analysis.js` 不在entry或引用中

**Step 2: 如果有引用，移除**

**Step 3: 构建验证**

```bash
npm run build
```

**Step 4: 如果有修改，提交**

---

## Phase 6: 最终验证与合并

### Task 12: 完整功能验证

**Files:**
- 无

**Step 1: 清理构建**

```bash
rm -rf dist/
npm run build
```

**Step 2: 重新加载扩展**

在Chrome中：
1. 进入 `chrome://extensions/`
2. 点击扩展的"重新加载"按钮

**Step 3: 端到端测试**

完整测试所有功能：
1. 配置API
2. 生成摘要
3. 查看历史记录
4. 测试错误场景

**Step 4: 运行lint检查**

```bash
npm run lint
```

Expected: 无lint错误

**Step 5: 运行测试（如果有）

```bash
npm test
```

**Step 6: 最终提交所有更改**

```bash
git add -A
git commit -m "chore: final cleanup and optimizations for streaming feature"
```

---

### Task 13: 合并到主分支

**Files:**
- 无

**Step 1: 切换到主分支**

```bash
git checkout develop
git pull origin develop
```

**Step 2: 合并功能分支**

```bash
git merge feature/streaming-summary --no-ff
```

**Step 3: 推送到远程**

```bash
git push origin develop
```

**Step 4: 清理功能分支（可选）**

```bash
git branch -d feature/streaming-summary
```

---

## 实施检查清单

- [ ] API配置已更新为智谱
- [ ] Content Script添加流式弹窗方法
- [ ] Content Script添加消息监听器
- [ ] Content Script修改按钮点击处理
- [ ] Background Service添加流式处理基础设施
- [ ] Background Service实现流式分析主逻辑
- [ ] Background Service实现SSE流解析
- [ ] 移除废弃的multimodal-analysis服务
- [ ] 手动测试通过
- [ ] Lint检查通过
- [ ] 代码已提交到develop分支

---

## 参考资料

- 设计文档: `docs/plans/2025-01-25-streaming-summary-design.md`
- 项目架构: `CLAUDE.md`
- 智谱API文档: https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash
- Chrome扩展文档: https://developer.chrome.com/docs/extensions/mv3/
