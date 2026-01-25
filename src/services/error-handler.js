// error-handler.js - 错误处理和用户反馈模块
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalErrorHandlers();
  }

  // 设置全局错误处理器
  setupGlobalErrorHandlers() {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'unhandledrejection');
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, 'globalerror');
    });
  }

  // 错误分类和处理
  handleError(error, context = 'unknown') {
    const errorInfo = this.categorizeError(error, context);
    
    // 记录错误
    this.logError(errorInfo);
    
    // 显示用户友好的错误提示
    this.showUserFriendlyError(errorInfo);
    
    // 根据错误类型采取不同的处理策略
    this.handleErrorByType(errorInfo);
    
    return errorInfo;
  }

  // 错误分类
  categorizeError(error, context) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      context,
      type: 'unknown',
      severity: 'low',
      message: '',
      details: {},
      stack: null
    };

    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;
      
      // 根据错误类型分类
      if (error.message.includes('网络') || error.message.includes('Network') || error.message.includes('fetch')) {
        errorInfo.type = 'network';
        errorInfo.severity = 'medium';
      } else if (error.message.includes('API') || error.message.includes('认证') || error.message.includes('401')) {
        errorInfo.type = 'api';
        errorInfo.severity = 'high';
      } else if (error.message.includes('解析') || error.message.includes('parse') || error.message.includes('格式')) {
        errorInfo.type = 'parse';
        errorInfo.severity = 'medium';
      } else if (error.message.includes('超时') || error.message.includes('timeout')) {
        errorInfo.type = 'timeout';
        errorInfo.severity = 'low';
      } else {
        errorInfo.type = 'runtime';
        errorInfo.severity = 'medium';
      }
    } else if (typeof error === 'string') {
      errorInfo.message = error;
    } else if (typeof error === 'object') {
      errorInfo.message = error.message || '未知错误';
      errorInfo.details = error;
    }

    return errorInfo;
  }

  // 根据错误类型处理
  handleErrorByType(errorInfo) {
    switch (errorInfo.type) {
      case 'network':
        this.handleNetworkError(errorInfo);
        break;
      case 'api':
        this.handleApiError(errorInfo);
        break;
      case 'parse':
        this.handleParseError(errorInfo);
        break;
      case 'timeout':
        this.handleTimeoutError(errorInfo);
        break;
      default:
        this.handleGenericError(errorInfo);
    }
  }

  // 处理网络错误
  handleNetworkError(errorInfo) {
    console.warn('🌐 网络错误:', errorInfo.message);
    
    // 尝试重连
    if (errorInfo.retryCount < 3) {
      setTimeout(() => {
        this.retryOperation(errorInfo);
      }, 2000 * (errorInfo.retryCount + 1));
    }
  }

  // 处理API错误
  handleApiError(errorInfo) {
    console.error('🔑 API错误:', errorInfo.message);
    
    // 检查是否需要更新API密钥
    if (errorInfo.message.includes('401') || errorInfo.message.includes('invalid')) {
      this.promptForApiKeyUpdate();
    }
  }

  // 处理解析错误
  handleParseError(errorInfo) {
    console.error('🔍 解析错误:', errorInfo.message);
    
    // 尝试使用备用解析方法
    this.tryAlternativeParsing(errorInfo);
  }

  // 处理超时错误
  handleTimeoutError(errorInfo) {
    console.warn('⏰ 超时错误:', errorInfo.message);
    
    // 增加超时时间
    this.increaseTimeout(errorInfo);
  }

  // 处理通用错误
  handleGenericError(errorInfo) {
    console.error('❌ 通用错误:', errorInfo.message);
  }

  // 重试操作
  retryOperation(errorInfo) {
    errorInfo.retryCount = (errorInfo.retryCount || 0) + 1;
    console.log(`🔄 第${errorInfo.retryCount}次重试操作`);
    
    // 触发重试事件
    window.dispatchEvent(new CustomEvent('error-retry', { detail: errorInfo }));
  }

  // 提示更新API密钥
  promptForApiKeyUpdate() {
    this.showNotification({
      type: 'warning',
      title: 'API密钥需要更新',
      message: '您的API密钥可能已过期或无效，请检查设置',
      action: '更新密钥',
      actionCallback: () => {
        // 打开设置页面
        chrome.runtime.sendMessage({ action: 'openSettings' });
      }
    });
  }

  // 尝试备用解析方法
  tryAlternativeParsing(errorInfo) {
    console.log('🔄 尝试备用解析方法');
    // 触发备用解析事件
    window.dispatchEvent(new CustomEvent('alternative-parse', { detail: errorInfo }));
  }

  // 增加超时时间
  increaseTimeout(errorInfo) {
    console.log('⏱️ 增加超时时间');
    // 触发超时调整事件
    window.dispatchEvent(new CustomEvent('timeout-increase', { detail: errorInfo }));
  }

  // 显示用户友好的错误提示
  showUserFriendlyError(errorInfo) {
    const userMessage = this.getUserFriendlyMessage(errorInfo);
    
    this.showNotification({
      type: this.getNotificationType(errorInfo.severity),
      title: this.getErrorTitle(errorInfo.type),
      message: userMessage,
      duration: this.getNotificationDuration(errorInfo.severity),
      action: errorInfo.severity === 'high' ? '查看详情' : null,
      actionCallback: errorInfo.severity === 'high' ? () => {
        this.showErrorDetails(errorInfo);
      } : null
    });
  }

  // 获取用户友好的错误消息
  getUserFriendlyMessage(errorInfo) {
    const messages = {
      network: '网络连接出现问题，请检查网络后重试',
      api: 'API服务出现问题，请检查设置或稍后重试',
      parse: '数据解析出现问题，正在尝试其他方法',
      timeout: '操作超时，正在延长等待时间',
      runtime: '程序运行出现问题，请稍后重试'
    };

    return messages[errorInfo.type] || '发生未知错误，请稍后重试';
  }

  // 获取通知类型
  getNotificationType(severity) {
    const types = {
      low: 'info',
      medium: 'warning',
      high: 'error'
    };
    return types[severity] || 'info';
  }

  // 获取错误标题
  getErrorTitle(errorType) {
    const titles = {
      network: '网络错误',
      api: 'API错误',
      parse: '解析错误',
      timeout: '超时错误',
      runtime: '运行错误'
    };
    return titles[errorType] || '错误';
  }

  // 获取通知持续时间
  getNotificationDuration(severity) {
    const durations = {
      low: 3000,
      medium: 5000,
      high: 8000
    };
    return durations[severity] || 3000;
  }

  // 显示通知
  showNotification(options) {
    const notification = document.createElement('div');
    notification.className = `error-notification error-notification-${options.type}`;
    notification.innerHTML = `
      <div class="error-notification-content">
        <div class="error-notification-header">
          <span class="error-notification-icon">${this.getNotificationIcon(options.type)}</span>
          <span class="error-notification-title">${options.title}</span>
        </div>
        <div class="error-notification-message">${options.message}</div>
        ${options.action ? `
          <div class="error-notification-action">
            <button class="error-notification-btn" onclick="this.closest('.error-notification').remove(); ${options.actionCallback ? options.actionCallback.toString() : ''}">
              ${options.action}
            </button>
          </div>
        ` : ''}
        <button class="error-notification-close" onclick="this.closest('.error-notification').remove()">×</button>
      </div>
    `;

    document.body.appendChild(notification);
    
    // 添加样式
    this.addNotificationStyles();
    
    // 自动移除
    if (options.duration) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, options.duration);
    }
  }

  // 获取通知图标
  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    return icons[type] || 'ℹ️';
  }

  // 添加通知样式
  addNotificationStyles() {
    if (document.getElementById('error-notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'error-notification-styles';
    style.textContent = `
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10003;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      }
      
      .error-notification-info {
        border-left: 4px solid #1890ff;
      }
      
      .error-notification-warning {
        border-left: 4px solid #faad14;
      }
      
      .error-notification-error {
        border-left: 4px solid #ff4d4f;
      }
      
      .error-notification-success {
        border-left: 4px solid #52c41a;
      }
      
      .error-notification-content {
        position: relative;
      }
      
      .error-notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .error-notification-title {
        font-weight: 500;
        font-size: 14px;
        color: #333;
      }
      
      .error-notification-message {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
        margin-bottom: 8px;
      }
      
      .error-notification-action {
        margin-top: 8px;
      }
      
      .error-notification-btn {
        background: #00a1d6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      
      .error-notification-close {
        position: absolute;
        top: -8px;
        right: -8px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
      }
      
      .error-notification-close:hover {
        color: #666;
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
  }

  // 显示错误详情
  showErrorDetails(errorInfo) {
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'error-details-panel';
    detailsPanel.innerHTML = `
      <div class="error-details-content">
        <div class="error-details-header">
          <h3>错误详情</h3>
          <button class="error-details-close" onclick="this.closest('.error-details-panel').remove()">×</button>
        </div>
        <div class="error-details-body">
          <div class="error-detail-item">
            <label>错误ID:</label>
            <span>${errorInfo.id}</span>
          </div>
          <div class="error-detail-item">
            <label>时间:</label>
            <span>${new Date(errorInfo.timestamp).toLocaleString()}</span>
          </div>
          <div class="error-detail-item">
            <label>类型:</label>
            <span>${errorInfo.type}</span>
          </div>
          <div class="error-detail-item">
            <label>严重程度:</label>
            <span class="severity-${errorInfo.severity}">${errorInfo.severity}</span>
          </div>
          <div class="error-detail-item">
            <label>消息:</label>
            <span>${errorInfo.message}</span>
          </div>
          ${errorInfo.stack ? `
            <div class="error-detail-item">
              <label>堆栈:</label>
              <pre>${errorInfo.stack}</pre>
            </div>
          ` : ''}
        </div>
        <div class="error-details-actions">
          <button class="error-details-btn" onclick="this.closest('.error-details-panel').remove()">关闭</button>
          <button class="error-details-btn" onclick="navigator.clipboard.writeText('${JSON.stringify(errorInfo, null, 2)}')">复制详情</button>
        </div>
      </div>
    `;

    document.body.appendChild(detailsPanel);
    this.addErrorDetailsStyles();
  }

  // 添加错误详情样式
  addErrorDetailsStyles() {
    if (document.getElementById('error-details-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'error-details-styles';
    style.textContent = `
      .error-details-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10004;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
      }
      
      .error-details-content {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .error-details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #f5f5f5;
        border-bottom: 1px solid #e8e8e8;
      }
      
      .error-details-header h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
      }
      
      .error-details-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
      }
      
      .error-details-close:hover {
        color: #666;
      }
      
      .error-details-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .error-detail-item {
        margin-bottom: 12px;
        display: flex;
        gap: 12px;
      }
      
      .error-detail-item label {
        font-weight: 500;
        color: #666;
        min-width: 80px;
        flex-shrink: 0;
      }
      
      .error-detail-item span {
        flex: 1;
        color: #333;
      }
      
      .error-detail-item pre {
        background: #f8f8f8;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        overflow-x: auto;
        margin: 0;
      }
      
      .severity-low {
        color: #52c41a;
      }
      
      .severity-medium {
        color: #faad14;
      }
      
      .severity-high {
        color: #ff4d4f;
      }
      
      .error-details-actions {
        padding: 16px 20px;
        border-top: 1px solid #e8e8e8;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      
      .error-details-btn {
        background: #00a1d6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .error-details-btn:hover {
        background: #0088b8;
      }
    `;
    
    document.head.appendChild(style);
  }

  // 记录错误
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
    
    // 保存到本地存储
    this.saveErrorLog();
  }

  // 保存错误日志
  saveErrorLog() {
    try {
      localStorage.setItem('bilibili-summary-errors', JSON.stringify(this.errorLog));
    } catch (error) {
      console.warn('无法保存错误日志:', error);
    }
  }

  // 加载错误日志
  loadErrorLog() {
    try {
      const saved = localStorage.getItem('bilibili-summary-errors');
      if (saved) {
        this.errorLog = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('无法加载错误日志:', error);
    }
  }

  // 获取错误统计
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // 清除错误日志
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('bilibili-summary-errors');
  }

  // 生成错误ID
  generateErrorId() {
    return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 获取最近的错误
  getRecentErrors(count = 10) {
    return this.errorLog.slice(-count);
  }

  // 按类型获取错误
  getErrorsByType(type) {
    return this.errorLog.filter(error => error.type === type);
  }

  // 按严重程度获取错误
  getErrorsBySeverity(severity) {
    return this.errorLog.filter(error => error.severity === severity);
  }
}

// 用户反馈管理器
class UserFeedbackManager {
  constructor() {
    this.feedbackQueue = [];
    this.isProcessing = false;
    this.feedbackTypes = {
      ANALYSIS_COMPLETE: 'analysis_complete',
      ANALYSIS_ERROR: 'analysis_error',
      NETWORK_ERROR: 'network_error',
      API_ERROR: 'api_error',
      SUCCESS: 'success',
      WARNING: 'warning',
      INFO: 'info'
    };
  }

  // 添加反馈到队列
  addFeedback(type, message, options = {}) {
    const feedback = {
      id: this.generateFeedbackId(),
      type,
      message,
      timestamp: Date.now(),
      options,
      priority: options.priority || 'normal',
      shown: false
    };

    this.feedbackQueue.push(feedback);
    this.processFeedbackQueue();
    return feedback;
  }

  // 处理反馈队列
  async processFeedbackQueue() {
    if (this.isProcessing || this.feedbackQueue.length === 0) return;
    
    this.isProcessing = true;
    
    // 按优先级排序
    this.feedbackQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    while (this.feedbackQueue.length > 0) {
      const feedback = this.feedbackQueue.shift();
      await this.showFeedback(feedback);
      feedback.shown = true;
    }
    
    this.isProcessing = false;
  }

  // 显示反馈
  async showFeedback(feedback) {
    switch (feedback.type) {
      case this.feedbackTypes.ANALYSIS_COMPLETE:
        this.showAnalysisCompleteFeedback(feedback);
        break;
      case this.feedbackTypes.ANALYSIS_ERROR:
        this.showAnalysisErrorFeedback(feedback);
        break;
      case this.feedbackTypes.NETWORK_ERROR:
        this.showNetworkErrorFeedback(feedback);
        break;
      case this.feedbackTypes.API_ERROR:
        this.showApiErrorFeedback(feedback);
        break;
      case this.feedbackTypes.SUCCESS:
        this.showSuccessFeedback(feedback);
        break;
      case this.feedbackTypes.WARNING:
        this.showWarningFeedback(feedback);
        break;
      case this.feedbackTypes.INFO:
        this.showInfoFeedback(feedback);
        break;
      default:
        this.showGenericFeedback(feedback);
    }
  }

  // 显示分析完成反馈
  showAnalysisCompleteFeedback(feedback) {
    this.showToast({
      type: 'success',
      title: '分析完成',
      message: feedback.message,
      duration: 5000,
      actions: [
        {
          text: '查看结果',
          callback: () => {
            this.showAnalysisResults(feedback.options.result);
          }
        },
        {
          text: '复制摘要',
          callback: () => {
            this.copyToClipboard(feedback.options.result);
          }
        }
      ]
    });
  }

  // 显示分析错误反馈
  showAnalysisErrorFeedback(feedback) {
    this.showToast({
      type: 'error',
      title: '分析失败',
      message: feedback.message,
      duration: 8000,
      actions: [
        {
          text: '重试',
          callback: () => {
            this.retryAnalysis(feedback.options);
          }
        },
        {
          text: '查看详情',
          callback: () => {
            this.showErrorDetails(feedback.options.error);
          }
        }
      ]
    });
  }

  // 显示网络错误反馈
  showNetworkErrorFeedback(feedback) {
    this.showToast({
      type: 'warning',
      title: '网络错误',
      message: feedback.message,
      duration: 6000,
      actions: [
        {
          text: '重试',
          callback: () => {
            this.retryNetworkRequest(feedback.options);
          }
        }
      ]
    });
  }

  // 显示API错误反馈
  showApiErrorFeedback(feedback) {
    this.showToast({
      type: 'error',
      title: 'API错误',
      message: feedback.message,
      duration: 8000,
      actions: [
        {
          text: '检查设置',
          callback: () => {
            this.openSettings();
          }
        }
      ]
    });
  }

  // 显示成功反馈
  showSuccessFeedback(feedback) {
    this.showToast({
      type: 'success',
      title: '成功',
      message: feedback.message,
      duration: 3000
    });
  }

  // 显示警告反馈
  showWarningFeedback(feedback) {
    this.showToast({
      type: 'warning',
      title: '警告',
      message: feedback.message,
      duration: 5000
    });
  }

  // 显示信息反馈
  showInfoFeedback(feedback) {
    this.showToast({
      type: 'info',
      title: '提示',
      message: feedback.message,
      duration: 3000
    });
  }

  // 显示通用反馈
  showGenericFeedback(feedback) {
    this.showToast({
      type: 'info',
      title: '提示',
      message: feedback.message,
      duration: 4000
    });
  }

  // 显示Toast通知
  showToast(options) {
    const toast = document.createElement('div');
    toast.className = `feedback-toast feedback-toast-${options.type}`;
    
    let actionsHtml = '';
    if (options.actions && options.actions.length > 0) {
      actionsHtml = `
        <div class="feedback-toast-actions">
          ${options.actions.map(action => `
            <button class="feedback-toast-action" onclick="this.closest('.feedback-toast').remove(); ${action.callback.toString()}">
              ${action.text}
            </button>
          `).join('')}
        </div>
      `;
    }
    
    toast.innerHTML = `
      <div class="feedback-toast-content">
        <div class="feedback-toast-header">
          <span class="feedback-toast-icon">${this.getToastIcon(options.type)}</span>
          <span class="feedback-toast-title">${options.title}</span>
        </div>
        <div class="feedback-toast-message">${options.message}</div>
        ${actionsHtml}
        <button class="feedback-toast-close" onclick="this.closest('.feedback-toast').remove()">×</button>
      </div>
    `;

    document.body.appendChild(toast);
    this.addToastStyles();
    
    if (options.duration) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, options.duration);
    }
  }

  // 获取Toast图标
  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  // 添加Toast样式
  addToastStyles() {
    if (document.getElementById('feedback-toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'feedback-toast-styles';
    style.textContent = `
      .feedback-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10005;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      }
      
      .feedback-toast-success {
        border-left: 4px solid #52c41a;
      }
      
      .feedback-toast-error {
        border-left: 4px solid #ff4d4f;
      }
      
      .feedback-toast-warning {
        border-left: 4px solid #faad14;
      }
      
      .feedback-toast-info {
        border-left: 4px solid #1890ff;
      }
      
      .feedback-toast-content {
        position: relative;
      }
      
      .feedback-toast-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .feedback-toast-title {
        font-weight: 500;
        font-size: 14px;
        color: #333;
      }
      
      .feedback-toast-message {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
        margin-bottom: 8px;
      }
      
      .feedback-toast-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }
      
      .feedback-toast-action {
        background: #00a1d6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      
      .feedback-toast-action:hover {
        background: #0088b8;
      }
      
      .feedback-toast-close {
        position: absolute;
        top: -8px;
        right: -8px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
      }
      
      .feedback-toast-close:hover {
        color: #666;
      }
    `;
    
    document.head.appendChild(style);
  }

  // 生成反馈ID
  generateFeedbackId() {
    return 'feedback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 显示分析结果
  showAnalysisResults(result) {
    console.log('显示分析结果:', result);
  }

  // 复制到剪贴板
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.addFeedback(this.feedbackTypes.SUCCESS, '已复制到剪贴板');
    }).catch(() => {
      this.addFeedback(this.feedbackTypes.ERROR, '复制失败，请手动复制');
    });
  }

  // 重试分析
  retryAnalysis(options) {
    console.log('重试分析:', options);
    // 触发重试事件
    window.dispatchEvent(new CustomEvent('retry-analysis', { detail: options }));
  }

  // 重试网络请求
  retryNetworkRequest(options) {
    console.log('重试网络请求:', options);
    // 触发重试事件
    window.dispatchEvent(new CustomEvent('retry-network', { detail: options }));
  }

  // 打开设置
  openSettings() {
    chrome.runtime.sendMessage({ action: 'openSettings' });
  }
}

// 导出实例
window.errorHandler = new ErrorHandler();
window.feedbackManager = new UserFeedbackManager();