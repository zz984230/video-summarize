# 流式视频摘要功能设计文档

**创建日期**: 2025-01-25
**文档类型**: 功能需求文档
**受众**: 开发团队

## 快速导航

| 我想了解... | 查看章节 |
|-------------|----------|
| 功能背景和目标 | [1. 概述](#1-概述) |
| 具体功能需求 | [2. 需求描述](#2-需求描述) |
| 整体架构和数据流 | [3. 技术方案设计](#3-技术方案设计) |
| 需要修改哪些文件 | [4. 实现细节 → 文件变更清单](#文件变更清单) |
| SSE流格式 | [3. 技术方案设计 → SSE解析逻辑](#sse-解析逻辑) |
| 错误处理 | [5. 错误处理](#5-错误处理) |
| UI/UX设计 | [6. UI/UX设计](#6-uiux设计) |
| 测试验证 | [7. 测试验证](#7-测试验证) |

---

## 1. 概述

### 背景

当前B站视频摘要插件使用传统的非流式API响应方式，用户需要等待AI完整分析整个视频后才能看到摘要结果。在视频分析过程中（通常需要10-30秒），用户只能看到"分析中..."的加载状态，无法获得任何中间反馈，导致等待焦虑和不确定性。

### 解决方案

实现流式展示功能，让用户实时看到AI生成摘要的过程。通过Server-Sent Events (SSE)技术，将AI返回的文本内容逐步推送到前端，用户可以像看打字机效果一样看到摘要逐字生成。

### 技术变更

- **API切换**：从ModelScope (Qwen3-VL) 切换到智谱AI GLM-4.6V-Flash
- **流式支持**：利用GLM-4.6V-Flash的原生流式响应能力 (`stream: true`)
- **架构调整**：Content Script与Background Service之间建立流式通信机制

### 功能范围

本次改动聚焦于流式展示功能的实现，暂不涉及其他功能优化：
- ✓ 实现流式文本展示
- ✓ 替换现有弹窗模式
- ✓ 完善错误处理机制
- ✗ 不优化其他功能（如分析类型选择、历史记录等）

### 受益用户

所有使用B站视频摘要插件的用户，无论视频类型（学习、娱乐、技术教程等）都能获得更好的交互体验。

### 改动范围

- **Content Script** (`content.js`): 弹窗即时创建、流式内容追加
- **Background Service** (`background.js`): SSE流式解析、消息转发
- **用户配置**: 更新API endpoint和模型配置

## 2. 需求描述

### 功能需求

#### 2.1 触发流程

1. 用户在B站视频页面点击"AI摘要"按钮
2. 立即弹出分析弹窗，无需等待API响应
3. 弹窗显示加载动画和提示文字："AI正在观看视频并生成摘要"
4. 后台开始调用智谱API进行视频分析

#### 2.2 流式展示

1. AI返回的文本内容（`delta.content`）逐块实时追加到弹窗中
2. 每接收到一个chunk后立即显示，无需打字机延迟效果
3. 内容区域自动滚动到底部，确保最新内容可见
4. 思考内容（`delta.reasoning_content`）后台处理，不在UI中展示

#### 2.3 完成状态

1. 流式结束后，状态徽章更新为"已完成"（绿色）
2. "复制结果"按钮从禁用状态变为可用
3. 关闭按钮保持可用，用户可随时关闭弹窗

#### 2.4 交互控制

1. 用户可通过以下方式关闭弹窗：
   - 点击右上角关闭按钮（×）
   - 点击弹窗外部遮罩层
   - 按ESC键
2. 关闭弹窗时，后台流式请求同步中止

### 非功能需求

| 需求项 | 要求 |
|--------|------|
| 响应速度 | chunk接收后100ms内更新UI |
| 兼容性 | 保持Chrome Manifest V3规范 |
| 性能 | 流式内容追加不阻塞主线程 |
| 可访问性 | 支持键盘操作（ESC关闭弹窗） |

### 用户场景

#### 场景1：学习类视频摘要

**用户行为**：在学习教程视频页面点击"AI摘要"

**预期体验**：
- 弹窗立即弹出，显示加载状态
- 逐步看到AI总结的知识点和要点
- 完成后可复制摘要用于笔记

#### 场景2：网络较慢环境

**用户行为**：在网络不稳定时点击摘要

**预期体验**：
- 虽然整体等待时间较长，但能看到内容逐步生成
- 获得即时反馈，减少等待焦虑
- 若网络中断，显示明确的错误提示

#### 场景3：中途关闭

**用户行为**：流式生成过程中关闭弹窗

**预期体验**：
- 弹窗关闭，后台请求中止
- 不显示错误提示（正常用户操作）
- 下次点击可重新生成

### 约束条件

1. **API约束**：必须使用智谱GLM-4.6V-Flash模型
2. **UI约束**：弹窗只显示摘要内容，不显示视频元信息（标题、时长等）
3. **错误处理**：只显示错误信息，不自动重试
4. **历史记录**：流式完成后，将完整摘要保存到chrome.storage.local

## 3. 技术方案设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Bilibili Video Page                      │
│  ┌────────────┐                                              │
│  │ AI摘要按钮 │ ──────▶ 点击触发                             │
│  └────────────┘                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                            │
│  1. 立即创建弹窗（加载状态）                                  │
│  2. 发送 START_STREAM_ANALYSIS 消息                          │
│  3. 监听 STREAM_CHUNK 消息，追加内容                         │
│  4. 处理 STREAM_END / STREAM_ERROR                           │
└────────────────────────┬────────────────────────────────────┘
                         │ chrome.runtime.sendMessage
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Background Service                          │
│  1. 接收 START_STREAM_ANALYSIS                              │
│  2. 调用智谱 GLM-4.6V-Flash API (stream: true)             │
│  3. 解析 SSE 流                                             │
│  4. 逐块发送 STREAM_CHUNK 消息到 Content                     │
│  5. 发送 STREAM_END / STREAM_ERROR                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              智谱 GLM-4.6V-Flash API                         │
│  Endpoint: https://open.bigmodel.cn/api/paas/v4/...         │
│  Response: Server-Sent Events (SSE)                         │
└─────────────────────────────────────────────────────────────┘
```

### 数据流设计

#### 消息类型定义

| 消息类型 | 方向 | 用途 | 数据结构 |
|----------|------|------|----------|
| START_STREAM_ANALYSIS | Content → Background | 启动流式分析 | `{ videoData, analysisType }` |
| STREAM_CHUNK | Background → Content | 传输文本块 | `{ content, isThinking }` |
| STREAM_END | Background → Content | 流式完成 | `{ fullContent }` |
| STREAM_ERROR | Background → Content | 错误通知 | `{ error }` |
| CANCEL_STREAM | Content → Background | 中止请求 | `{ tabId }` |

#### 请求/响应格式

**智谱 API 请求：**
```javascript
{
  "model": "glm-4.6v-flash",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "video_url", "video_url": { "url": "..." } },
      { "type": "text", "text": "分析提示词" }
    ]
  }],
  "stream": true,
  "thinking": { "type": "enabled" }
}
```

**SSE 响应格式：**
```
data: {"id":"...","choices":[{"delta":{"content":"文本片段"}}]}

data: {"id":"...","choices":[{"delta":{"reasoning_content":"思考"}}]}

data: [DONE]
```

### 组件设计

#### Content Script (`content.js`)

**新增方法：**

| 方法 | 职责 |
|------|------|
| `createStreamModal()` | 创建流式弹窗，返回DOM元素 |
| `appendStreamContent(text, isThinking)` | 追加内容到弹窗 |
| `onStreamComplete(fullContent)` | 处理流式完成 |
| `onStreamError(error)` | 处理错误 |
| `showLoadingState()` | 显示加载动画 |
| `resetButtonState()` | 重置按钮状态 |

**修改方法：**
- `onSummaryButtonClick()` - 改为立即创建弹窗，发送流式请求

**新增监听器：**
```javascript
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'STREAM_CHUNK') { /* ... */ }
  if (request.action === 'STREAM_END') { /* ... */ }
  if (request.action === 'STREAM_ERROR') { /* ... */ }
});
```

#### Background Service (`background.js`)

**新增方法：**

| 方法 | 职责 |
|------|------|
| `handleStreamAnalysis(request, sender)` | 处理流式分析请求 |
| `parseSSEStream(response, sender)` | 解析SSE流并转发 |
| `buildPrompt(videoData, analysisType)` | 构建分析提示词 |

**修改消息处理：**
```javascript
switch (request.action) {
  case 'START_STREAM_ANALYSIS':
    return this.handleStreamAnalysis(request, sender);
  case 'CANCEL_STREAM':
    // 中断当前流式请求
    break;
}
```

**新增状态管理：**
```javascript
this.currentStreamReader = null;  // 当前流式读取器
this.activeTabId = null;          // 当前活跃标签页
```

### SSE 解析逻辑

```javascript
async parseSSEStream(response, sender) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          chrome.tabs.sendMessage(sender.tab.id, { action: 'STREAM_END' });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices[0]?.delta;

          if (delta?.content) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: 'STREAM_CHUNK',
              data: { content: delta.content, isThinking: false }
            });
          }
          // reasoning_content 不转发到前端
        } catch (e) {
          console.warn('解析chunk失败:', data);
        }
      }
    }
  }
}
```

### API 配置变更

| 配置项 | 旧值 | 新值 |
|--------|------|------|
| baseUrl | https://api-inference.modelscope.cn/v1 | https://open.bigmodel.cn/api/paas/v4 |
| model | Qwen/Qwen3-VL-8B-Instruct | glm-4.6v-flash |
| 视频参数 | video_url | video_url.video_url |
| 流式参数 | 不支持 | stream: true |

## 4. 实现细节

### Content Script 改动

#### 文件：`src/content.js`

**1. 修改 onSummaryButtonClick 方法**

```javascript
async onSummaryButtonClick() {
  try {
    console.log('🔄 点击AI摘要按钮，开始流式分析...');

    // 立即创建弹窗，显示加载状态
    const modal = this.createStreamModal();
    document.body.appendChild(modal);

    // 保存弹窗引用
    this.currentModal = modal;

    // 发起流式分析请求
    const result = await this.sendMessageToBackground('START_STREAM_ANALYSIS', {
      videoData: this.currentVideoInfo,
      analysisType: 'general'
    });

    // 注意：这里是立即返回，不是等待完整结果
    console.log('✅ 流式分析请求已发送');
  } catch (error) {
    console.error('❌ 启动流式分析失败:', error);
    this.onStreamError(error.message);
  }
}
```

**2. 新增 createStreamModal 方法**

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
  `;

  document.head.appendChild(style);
}

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

  // 键盘事件
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && this.currentModal) {
      this.closeModal();
    }
  });
}
```

**3. 新增消息监听器**

```javascript
// 在构造函数中添加
constructor() {
  // ... 现有代码
  this.setupStreamListener();
  this.currentModal = null;
  this.fullContent = '';
}

setupStreamListener() {
  chrome.runtime.onMessage.addListener((request) => {
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
    }
  });
}

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

  // 自动滚动到底部
  contentEl.scrollTop = contentEl.scrollHeight;
}

onStreamComplete(fullContent) {
  if (!this.currentModal) return;

  const statusBadge = this.currentModal.querySelector('.status-badge');
  const copyBtn = this.currentModal.querySelector('.copy-btn');
  const headerTitle = this.currentModal.querySelector('.modal-header h3');

  statusBadge.className = 'status-badge completed';
  statusBadge.textContent = '已完成';
  copyBtn.disabled = false;
  headerTitle.textContent = '🎬 视频分析结果';

  this.resetButtonState();

  // 保存到历史记录
  this.saveToHistory(fullContent);
}

onStreamError(error) {
  if (!this.currentModal) return;

  const contentEl = this.currentModal.querySelector('#streamContent');
  const statusBadge = this.currentModal.querySelector('.status-badge');

  // 移除加载动画
  const loadingEl = contentEl.querySelector('.loading-indicator');
  if (loadingEl) loadingEl.remove();

  // 显示错误
  contentEl.innerHTML = `<p style="color: #dc3545;">❌ ${error}</p>`;
  statusBadge.className = 'status-badge error';
  statusBadge.textContent = '分析失败';

  this.resetButtonState();
}

closeModal() {
  if (this.currentModal) {
    document.body.removeChild(this.currentModal);
    this.currentModal = null;
  }

  // 通知后台中止流式请求
  this.sendMessageToBackground('CANCEL_STREAM', {});
}

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
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}
```

### Background Service 改动

#### 文件：`src/background.js`

**1. 新增流式处理方法**

```javascript
class BackgroundService {
  constructor() {
    // ... 现有代码
    this.currentStreamReader = null;
    this.activeTabId = null;
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        // ... 现有 case
        case 'START_STREAM_ANALYSIS':
          return await this.handleStreamAnalysis(request, sender);
        case 'CANCEL_STREAM':
          return this.cancelStream();
        default:
          sendResponse({ success: false, error: '未知消息类型' });
      }
    } catch (error) {
      console.error('❌ 消息处理错误:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  async handleStreamAnalysis(request, sender) {
    try {
      const { videoData, analysisType } = request.data;
      this.activeTabId = sender.tab.id;

      // 获取API配置
      const result = await this.getStorage(['apiKey', 'apiUrl', 'modelId']);
      const apiKey = result.apiKey;

      if (!apiKey) {
        throw new Error('请先在设置页面配置API密钥');
      }

      // 获取视频播放地址
      const parser = new BilibiliVideoParser();
      const videoInfo = await parser.getVideoInfo(videoData.bvid);
      const videoUrls = await parser.getVideoUrls(
        videoInfo.aid,
        videoInfo.pages[0].cid,
        64
      );

      if (!videoUrls || videoUrls.length === 0) {
        throw new Error('无法获取视频播放地址');
      }

      // 构建请求
      const requestBody = {
        model: result.modelId || 'glm-4.6v-flash',
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

      // 发起流式请求
      const response = await fetch(`${result.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API错误: ${response.status} - ${errorText}`);
      }

      // 解析SSE流
      await this.parseSSEStream(response, sender.tab.id);

    } catch (error) {
      console.error('❌ 流式分析失败:', error);
      chrome.tabs.sendMessage(this.activeTabId, {
        action: 'STREAM_ERROR',
        data: { error: error.message }
      });
    }
  }

  async parseSSEStream(response, tabId) {
    const reader = response.body.getReader();
    this.currentStreamReader = reader;
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              chrome.tabs.sendMessage(tabId, {
                action: 'STREAM_END',
                data: { fullContent }
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                chrome.tabs.sendMessage(tabId, {
                  action: 'STREAM_CHUNK',
                  data: { content: delta.content, isThinking: false }
                });
              }
              // reasoning_content 不处理
            } catch (e) {
              console.warn('解析chunk失败:', data);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('流式请求已中止');
      } else {
        throw error;
      }
    } finally {
      this.currentStreamReader = null;
    }
  }

  cancelStream() {
    if (this.currentStreamReader) {
      this.currentStreamReader.cancel();
      this.currentStreamReader = null;
    }
  }

  buildPrompt(videoData, analysisType) {
    // ... 使用现有的 buildAnalysisPrompt 方法
    const baseInfo = {
      title: videoData.title || '未知标题',
      owner: videoData.owner || '未知作者',
      duration: this.formatDuration(videoData.duration || 0),
      view: videoData.view || 0
    };

    return `请详细分析这个视频的内容。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${baseInfo.duration}，播放量${baseInfo.view}。请提供：
1. 视频的主要内容摘要
2. 关键信息和要点
3. 视频的结构和逻辑
4. 适合观看的受众群体
5. 内容的价值和意义`;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
```

### API 配置更新

#### 文件：`src/options.js`

**默认配置变更：**

```javascript
async loadConfiguration() {
  const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId']);

  this.apiUrl = result.apiUrl || 'https://open.bigmodel.cn/api/paas/v4';
  this.modelId = result.modelId || 'glm-4.6v-flash';
  // ...
}
```

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/content.js` | 修改 | 新增流式弹窗、消息监听器 |
| `src/background.js` | 修改 | 新增流式处理、SSE解析 |
| `src/options.js` | 修改 | 更新默认API配置 |
| `src/multimodal-analysis.js` | 可删除 | 不再需要，功能合并到background.js |

## 5. 错误处理

### 错误场景与处理策略

| 错误场景 | 检测方式 | 处理策略 | 用户提示 |
|----------|----------|----------|----------|
| API密钥未配置 | 存储读取为空 | 立即返回错误 | "请先在设置页面配置API密钥" |
| 网络请求失败 | response.ok === false | 解析错误信息并返回 | "API错误: {status} - {message}" |
| 请求超时 | 60秒定时器 | 取消请求，返回错误 | "请求超时，请重试" |
| SSE解析失败 | JSON.parse异常 | 跳过该chunk，记录警告 | 后台静默处理 |
| 流式中断 | AbortError | 正常中止，不显示错误 | 无（用户主动关闭） |
| 视频URL获取失败 | Bilibili API返回空 | 返回错误 | "无法获取视频播放地址" |

### Content Script 错误处理

```javascript
// content.js

onStreamError(error) {
  if (!this.currentModal) return;

  const contentEl = this.currentModal.querySelector('#streamContent');
  const statusBadge = this.currentModal.querySelector('.status-badge');
  const headerTitle = this.currentModal.querySelector('.modal-header h3');

  // 移除加载动画
  const loadingEl = contentEl.querySelector('.loading-indicator');
  if (loadingEl) loadingEl.remove();

  // 显示错误信息
  contentEl.innerHTML = `
    <div style="padding: 20px; text-align: center;">
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
    </div>
  `;

  statusBadge.className = 'status-badge error';
  statusBadge.textContent = '分析失败';
  headerTitle.textContent = '🎬 分析失败';

  this.resetButtonState();
}

escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Background Service 错误处理

```javascript
// background.js

async handleStreamAnalysis(request, sender) {
  // 添加超时控制
  const timeoutId = setTimeout(() => {
    if (this.currentStreamReader) {
      this.currentStreamReader.cancel();
    }
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'STREAM_ERROR',
      data: { error: '请求超时（60秒），请重试' }
    });
  }, 60000); // 60秒超时

  try {
    // ... API调用逻辑

    const response = await fetch(...);

    if (!response.ok) {
      const errorText = await response.text();
      clearTimeout(timeoutId);
      throw new Error(`API错误 (${response.status}): ${errorText}`);
    }

    await this.parseSSEStream(response, sender.tab.id);
    clearTimeout(timeoutId);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ 流式分析失败:', error);

    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'STREAM_ERROR',
      data: { error: error.message }
    });
  }
}

async parseSSEStream(response, tabId) {
  // ... 在 finally 块中清理
  try {
    // SSE解析逻辑
  } catch (error) {
    if (error.name !== 'AbortError') {
      throw error; // 重新抛出非中止错误
    }
  } finally {
    this.currentStreamReader = null;
    this.activeTabId = null;
  }
}
```

### SSE 解析容错

```javascript
// background.js

for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim();

    if (data === '[DONE]') {
      // 正常结束
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
      const parsed = JSON.parse(data);
      const delta = parsed.choices[0]?.delta;

      if (delta?.content) {
        // 处理内容...
      }
    } catch (e) {
      // JSON解析失败，记录警告但不中断流
      console.warn('SSE chunk解析失败:', data, e);
      continue;
    }
  }
}
```

### 用户主动关闭处理

```javascript
// content.js

closeModal() {
  if (this.currentModal) {
    document.body.removeChild(this.currentModal);
    this.currentModal = null;
  }

  // 通知后台中止（静默，不显示错误）
  this.sendMessageToBackground('CANCEL_STREAM', {});

  this.resetButtonState();
}

// background.js

cancelStream() {
  if (this.currentStreamReader) {
    this.currentStreamReader.cancel(); // 触发 AbortError
    console.log('流式请求已由用户中止');
  }
  this.currentStreamReader = null;
  this.activeTabId = null;
}
```

### 页面导航处理

```javascript
// content.js

// 监听页面卸载，自动清理
window.addEventListener('beforeunload', () => {
  if (this.currentModal) {
    this.sendMessageToBackground('CANCEL_STREAM', {});
  }
});
```

### 错误日志记录

```javascript
// background.js

class BackgroundService {
  constructor() {
    // ... 现有代码
    this.errorLog = [];
  }

  logError(context, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context: context,
      error: error.message,
      stack: error.stack
    };

    this.errorLog.push(logEntry);

    // 限制日志大小
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    console.error(`[${context}]`, error);
  }

  getErrorLog() {
    return this.errorLog;
  }
}
```

### 错误恢复建议

| 错误类型 | 恢复建议 |
|----------|----------|
| API密钥未配置 | 引导用户打开设置页面 |
| 网络错误 | 提示检查网络连接，提供重试按钮 |
| API限流 | 提示稍后重试 |
| 视频不可用 | 提示视频可能需要登录或为付费内容 |
| 解析失败 | 提供反馈渠道，记录日志用于调试 |

## 6. UI/UX设计

### 弹窗设计

#### 布局结构

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │  🎬 视频分析中...        [×]      │  │ ← Header
│  ├───────────────────────────────────┤  │
│  │                                   │  │
│  │    ╱╲╱╲╱╲                        │  │ ← Loading
│  │   AI正在观看视频并生成摘要         │  │
│  │                                   │  │
│  │  [流式内容逐步显示区域...]         │  │ ← Content
│  │                                   │  │
│  ├───────────────────────────────────┤  │
│  │  [生成中]              [复制结果] │  │ ← Footer
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 视觉规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 弹窗宽度 | max-width | 600px |
| 弹窗高度 | max-height | 80vh |
| 圆角 | border-radius | 12px |
| 阴影 | box-shadow | 0 10px 30px rgba(0,0,0,0.3) |
| 主题色 | primary | #667eea (渐变: #667eea → #764ba2) |
| 背景色 | background | #ffffff |
| 文字颜色 | color | #333333 |
| 行高 | line-height | 1.8 |

### 状态设计

#### 1. 初始状态（加载中）

```
┌─────────────────────────────────────────┐
│  🎬 视频分析中...                        │
├─────────────────────────────────────────┤
│                                         │
│         ╱╲╱╲╱╲                         │
│    AI正在观看视频并生成摘要              │
│                                         │
├─────────────────────────────────────────┤
│  ⏳ 生成中                     [复制结果]│
└─────────────────────────────────────────┘
```

- 旋转动画：1秒/圈，无限循环
- 提示文字：居中显示
- 复制按钮：禁用状态（灰色）

#### 2. 流式生成中

```
┌─────────────────────────────────────────┐
│  🎬 视频分析中...                        │
├─────────────────────────────────────────┤
│ 这个视频主要讲解了...                    │
│ 第一部分介绍了...                        │
│ 然后演示了...                            │
│ ▼ 光标自动滚动到底部                     │
├─────────────────────────────────────────┤
│  ⏳ 生成中                     [复制结果]│
└─────────────────────────────────────────┘
```

- 内容逐块追加
- 自动滚动到底部
- 无闪烁，无抖动
- 保持状态为"生成中"

#### 3. 完成状态

```
┌─────────────────────────────────────────┐
│  🎬 视频分析结果                         │
├─────────────────────────────────────────┤
│ [完整的摘要内容...]                      │
│                                         │
│ 1. 视频的主要内容摘要                     │
│ 2. 关键信息和要点                        │
│ ...                                     │
├─────────────────────────────────────────┤
│  ✓ 已完成                   [复制结果]  │
└─────────────────────────────────────────┘
```

- 标题改为"视频分析结果"
- 状态徽章：绿色背景，"已完成"
- 复制按钮：启用，可点击

#### 4. 错误状态

```
┌─────────────────────────────────────────┐
│  🎬 分析失败                             │
├─────────────────────────────────────────┤
│                                         │
│             ⚠️                          │
│        API错误: 401                     │
│     请检查API密钥配置                    │
│                                         │
│        [重新加载]                       │
├─────────────────────────────────────────┤
│  ✗ 分析失败                     [复制结果]│
└─────────────────────────────────────────┘
```

- 警告图标：48px
- 错误信息：红色文字
- 提供重试操作按钮
- 状态徽章：红色背景，"分析失败"

### 动画效果

#### 弹窗入场动画

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stream-modal {
  animation: slideIn 0.3s ease-out;
}
```

#### 内容淡入动画

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stream-content {
  animation: fadeIn 0.5s ease-in;
}
```

#### 加载旋转动画

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### 交互细节

#### 关闭弹窗

**触发方式：**
1. 点击右上角 × 按钮
2. 点击弹窗外部遮罩层
3. 按 ESC 键

**行为：**
- 弹窗淡出移除
- 后台流式请求中止
- AI摘要按钮恢复可用状态
- 不显示错误提示（正常操作）

#### 复制功能

**触发：**点击"复制结果"按钮

**成功反馈：**
- Alert提示："结果已复制到剪贴板"
- 按钮短暂闪烁或变色

**错误处理：**
- 如果复制失败，显示错误提示
- 提供手动复制指引

#### 滚动行为

**自动滚动：**
- 新内容追加时自动滚动到底部
- 用户手动滚动时停止自动滚动
- 检测用户滚动意图：如果 scrollTop < maxScrollTop - 50

**滚动策略：**
```javascript
appendStreamContent(text) {
  // ... 追加内容

  const contentEl = this.currentModal.querySelector('#streamContent');
  const isNearBottom = contentEl.scrollHeight - contentEl.scrollTop - contentEl.clientHeight < 50;

  if (isNearBottom) {
    contentEl.scrollTop = contentEl.scrollHeight;
  }
}
```

### 响应式设计

#### 不同屏幕尺寸适配

| 屏幕宽度 | 弹窗宽度 | 内边距 | 字体大小 |
|----------|----------|--------|----------|
| < 480px | 95% | 15px | 14px |
| 480px - 768px | 90% | 18px | 15px |
| > 768px | 600px | 20px | 16px |

```css
@media (max-width: 480px) {
  .stream-modal .modal-content {
    width: 95%;
    padding: 15px;
  }
  .stream-modal .modal-body {
    font-size: 14px;
  }
}
```

### 可访问性

#### 键盘导航

- **ESC**: 关闭弹窗
- **Tab**: 在弹窗内元素间导航
- **Shift+Tab**: 反向导航

#### ARIA 属性

```html
<div class="stream-modal" role="dialog" aria-labelledby="modal-title">
  <div class="modal-header">
    <h3 id="modal-title">🎬 视频分析中...</h3>
  </div>
  <div class="modal-body" aria-live="polite" aria-atomic="false">
    <!-- 流式内容 -->
  </div>
  <button aria-label="关闭弹窗" class="close-btn">&times;</button>
</div>
```

#### 焦点管理

- 弹窗打开时，焦点移到关闭按钮
- 弹窗关闭时，焦点返回到触发按钮
- Tab键循环在弹窗内元素

### 性能优化

#### DOM 操作优化

```javascript
// 使用 DocumentFragment 减少重排
appendStreamContent(text) {
  const span = document.createElement('span');
  span.textContent = text;

  const contentEl = this.currentModal.querySelector('#streamContent');
  contentEl.appendChild(span);
}

// 批量更新（如果需要）
const updateBatch = [];
function flushUpdates() {
  if (updateBatch.length > 0) {
    contentEl.append(...updateBatch);
    updateBatch.length = 0;
  }
}
```

#### 防止内存泄漏

```javascript
// 组件清理
cleanup() {
  if (this.currentModal) {
    this.currentModal.remove();
    this.currentModal = null;
  }
  this.fullContent = '';
  this.currentStreamReader = null;
}
```

## 7. 测试验证

### 测试场景

#### 功能测试

| 场景 | 测试步骤 | 预期结果 |
|------|----------|----------|
| 正常流式展示 | 1. 打开B站视频页面<br>2. 点击"AI摘要"按钮<br>3. 等待流式响应 | 弹窗立即弹出，内容逐步显示，最终显示完成状态 |
| 思考内容过滤 | 1. 发起流式请求<br>2. 后台收到reasoning_content | 思考内容不在UI中显示 |
| 中途关闭弹窗 | 1. 流式生成中<br>2. 点击关闭按钮 | 弹窗关闭，后台请求中止，无错误提示 |
| 复制功能 | 1. 流式完成后<br>2. 点击"复制结果"按钮 | 内容复制到剪贴板，显示成功提示 |
| 键盘操作 | 1. 弹窗打开<br>2. 按ESC键 | 弹窗关闭，后台中止 |
| 历史记录保存 | 1. 流式完成<br>2. 打开Popup历史记录 | 完整摘要已保存到历史 |
| 网络错误 | 1. 断开网络<br>2. 点击"AI摘要" | 显示网络错误提示 |
| API密钥缺失 | 1. 清空API配置<br>2. 点击"AI摘要" | 显示"请先配置API密钥"提示 |

#### 兼容性测试

| 测试项 | 测试内容 |
|--------|----------|
| Chrome版本 | Chrome 114+, Edge 114+ |
| 操作系统 | Windows 10/11, macOS 12+, Linux |
| 屏幕尺寸 | 1920x1080, 1366x768, 375x667 (移动) |
| 视频类型 | 短视频(<1min), 中等(1-10min), 长视频(>10min) |
| 多P视频 | 多分P视频的第一P |

#### 性能测试

| 指标 | 测试方法 | 目标值 |
|------|----------|--------|
| 弹窗响应时间 | 点击按钮到弹窗显示 | < 100ms |
| 内容更新延迟 | 接收chunk到UI更新 | < 100ms |
| 内存占用 | 流式过程中内存增长 | < 50MB |
| CPU占用 | 流式渲染时CPU使用 | < 20% |
| 超时处理 | 60秒无响应 | 自动中止并提示 |

### 手动测试用例

#### 用例1：正常流程

```
前置条件：
- 已配置有效的智谱API密钥
- 网络连接正常

步骤：
1. 访问任意B站视频页面
2. 点击"AI摘要"按钮
3. 观察弹窗是否立即弹出
4. 等待流式内容逐步显示
5. 验证内容是否连贯完整
6. 检查状态是否变为"已完成"
7. 点击"复制结果"按钮
8. 粘贴验证内容是否正确

预期结果：
- 弹窗在100ms内弹出
- 显示加载动画和提示
- 内容逐步追加，无闪烁
- 完成后状态更新
- 复制功能正常
```

#### 用例2：网络中断

```
前置条件：
- 已配置API密钥
- 网络连接正常

步骤：
1. 点击"AI摘要"按钮
2. 流式生成中禁用网络
3. 观察错误处理

预期结果：
- 显示网络错误提示
- 状态变为"分析失败"
- 提供"重新加载"按钮
- 后台请求正确中止
```

#### 用例3：用户主动关闭

```
前置条件：
- 已配置API密钥
- 流式生成中

步骤：
1. 流式内容正在显示
2. 点击关闭按钮（或按ESC）
3. 重新点击"AI摘要"按钮

预期结果：
- 弹窗立即关闭
- 无错误提示
- 可以重新发起分析
- 后台请求已中止
```

### 自动化测试

#### 单元测试

```javascript
// src/__tests__/streamHandler.test.ts

describe('StreamHandler', () => {
  test('should parse SSE chunk correctly', () => {
    const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result.content).toBe('Hello');
  });

  test('should handle [DONE] signal', () => {
    const chunk = 'data: [DONE]\n\n';
    const result = parseSSEChunk(chunk);
    expect(result.done).toBe(true);
  });

  test('should filter out reasoning_content', () => {
    const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result.content).toBeUndefined();
  });
});
```

#### 集成测试

```javascript
// src/__tests__/integration/stream.integration.test.ts

describe('Stream Integration', () => {
  test('full flow from button click to stream completion', async () => {
    // Mock fetch response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: mockSSEStream(['Hello', ' World', [DONE]])
      })
    );

    // Simulate button click
    await clickSummaryButton();

    // Verify modal creation
    expect(document.querySelector('.stream-modal')).toBeTruthy();

    // Verify content updates
    await waitFor(() => {
      expect(getStreamContent()).toBe('Hello World');
    });
  });
});
```

### 测试数据准备

#### Mock SSE 响应

```javascript
// 测试用的模拟SSE流
const mockSSEStream = (chunks) => {
  const encoder = new TextEncoder();
  const chunksWithData = chunks.map(chunk => {
    if (chunk === '[DONE]') {
      return encoder.encode('data: [DONE]\n\n');
    }
    return encoder.encode(`data: {"choices":[{"delta":{"content":"${chunk}"}}]}\n\n`);
  });

  // 创建可读流
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunksWithData) {
        controller.enqueue(chunk);
        await new Promise(r => setTimeout(r, 100)); // 模拟延迟
      }
      controller.close();
    }
  });
};
```

### 验收标准

#### 必须满足（P0）

- ✓ 点击按钮后100ms内弹窗显示
- ✓ 流式内容实时显示，无卡顿
- ✓ 超时60秒自动中止并提示
- ✓ 用户关闭弹窗时后台正确中止
- ✓ 完成后摘要保存到历史记录
- ✓ 所有错误场景有明确提示

#### 应该满足（P1）

- ✓ 键盘快捷键正常工作
- ✓ 移动端响应式布局正常
- ✓ 复制功能稳定可靠
- ✓ 内存占用在合理范围

#### 可以满足（P2）

- ✓ 弹窗动画流畅自然
- ✓ 内容滚动平滑
- ✓ 加载动画美观

### 回归测试

验证流式功能不影响现有功能：

| 功能 | 验证方法 |
|------|----------|
| 视频信息提取 | 打开视频页面，检查BV号提取是否正常 |
| 按钮注入 | 刷新页面，检查按钮是否正确显示 |
| 设置页面 | 打开选项页，检查配置是否正常加载 |
| 历史记录 | 查看历史记录，检查旧数据兼容性 |

### 测试环境

| 环境 | Chrome版本 | 用途 |
|------|------------|------|
| 开发环境 | Chrome 120+ | 日常开发调试 |
| 测试环境 | Chrome 114, 115, 116 | 兼容性验证 |
| 生产环境 | Chrome 最新稳定版 | 发布前验证 |

### Bug 反馈流程

发现Bug时的处理流程：

1. **记录信息**：复现步骤、Chrome版本、控制台错误
2. **定位问题**：Content Script / Background Service / API
3. **临时方案**：是否需要回滚
4. **修复验证**：修复后回归测试
5. **更新文档**：如需要，更新测试用例

---

## 附录

### A. 相关文档

- [CLAUDE.md](../../CLAUDE.md) - 项目架构文档
- [Skill: bilibili-video-summarizer](../../.claude/skills/bilibili-video-summarizer/)

### B. 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2025-01-25 | 1.0 | 初始版本 | Claude |
