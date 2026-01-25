// 弹窗界面脚本
class PopupController {
  constructor() {
    this.currentTab = null;
    this.currentVideo = null;
    this.init();
  }

  async init() {
    console.log('🪟 弹窗界面初始化');
    
    // 确保DOM完全加载后再初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._init());
    } else {
      this._init();
    }
  }

  async _init() {
    // 获取当前标签页
    await this.getCurrentTab();
    
    // 绑定事件
    this.bindEvents();
    
    // 检查当前页面状态
    this.checkPageState();
    
    // 加载历史记录
    this.loadHistory();
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log('📄 当前标签页:', tab.url);
    } catch (error) {
      console.error('❌ 获取当前标签页失败:', error);
    }
  }

  bindEvents() {
    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    // 生成按钮
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateSummary();
      });
    }

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    // 更新标签页状态
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`${tabName}-content`);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    // 加载历史记录
    if (tabName === 'history') {
      this.loadHistory();
    }
  }

  checkPageState() {
    const urlDisplay = document.getElementById('currentUrl');
    
    if (!this.currentTab || !this.currentTab.url) {
      if (urlDisplay) urlDisplay.textContent = '无法获取当前页面';
      const generateBtn = document.getElementById('generateBtn');
      if (generateBtn) generateBtn.disabled = true;
      return;
    }

    if (urlDisplay) {
      urlDisplay.textContent = this.currentTab.url;
    }

    // 检查是否为B站视频页面
    const isBilibiliVideo = this.currentTab.url.includes('/video/') && 
                           (this.currentTab.url.includes('BV') || this.currentTab.url.includes('av'));

    if (!isBilibiliVideo) {
      this.showError('请在B站视频页面使用此插件');
      const generateBtn = document.getElementById('generateBtn');
      if (generateBtn) generateBtn.disabled = true;
    }
  }

  async generateSummary() {
    if (!this.currentTab || !this.currentVideo) {
      this.showError('视频信息获取失败');
      return;
    }

    try {
      this.showLoading(true);
      
      // 发送消息给background script
      const response = await this.sendMessage('ANALYZE_VIDEO', {
        videoUrl: this.currentTab.url,
        videoTitle: this.currentVideo?.title || '未知标题'
      });

      if (response.success) {
        this.hideLoading();
        this.displaySummary(response.summary);
        this.saveToHistory(this.currentVideo?.title || '未知标题', response.summary);
        this.showSuccess('摘要生成成功！');
      } else {
        throw new Error(response.error || '分析失败');
      }
    } catch (error) {
      this.hideLoading();
      this.showError('生成摘要失败: ' + error.message);
    }
  }

  displaySummary(summary) {
    const summarySection = document.getElementById('summarySection');
    const summaryContent = document.getElementById('summaryContent');
    
    if (summaryContent) {
      summaryContent.textContent = summary;
    }
    if (summarySection) {
      summarySection.style.display = 'block';
      
      // 滚动到摘要区域
      summarySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const generateBtn = document.getElementById('generateBtn');
    
    if (loadingState) {
      loadingState.style.display = show ? 'block' : 'none';
    }
    if (generateBtn) {
      generateBtn.disabled = show;
    }
  }

  hideLoading() {
    this.showLoading(false);
  }

  showError(message) {
    const errorState = document.getElementById('errorState');
    if (errorState) {
      errorState.textContent = message;
      errorState.style.display = 'block';
      
      setTimeout(() => {
        errorState.style.display = 'none';
      }, 5000);
    }
  }

  showSuccess(message) {
    const successState = document.getElementById('successState');
    if (successState) {
      successState.textContent = message;
      successState.style.display = 'block';
      
      setTimeout(() => {
        successState.style.display = 'none';
      }, 2000);
    }
  }

  async loadHistory() {
    try {
      const result = await chrome.storage.local.get(['summaryHistory']);
      const history = result.summaryHistory || [];
      
      const historyList = document.getElementById('historyList');
      
      if (!historyList) return;
      
      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">暂无历史记录</div>
          </div>
        `;
        return;
      }
      
      historyList.innerHTML = history.map(item => `
        <div class="history-item">
          <div class="history-title">${item.title}</div>
          <div class="history-summary">${item.summary}</div>
          <div class="history-meta">
            <span>${item.date}</span>
            <span>${item.url}</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  }

  async saveToHistory(title, summary) {
    try {
      const result = await chrome.storage.local.get(['summaryHistory']);
      const history = result.summaryHistory || [];
      
      const newItem = {
        title: title,
        summary: summary,
        date: new Date().toLocaleString(),
        url: this.currentTab.url
      };
      
      history.unshift(newItem);
      
      // 限制历史记录数量
      if (history.length > 50) {
        history.splice(50);
      }
      
      await chrome.storage.local.set({ summaryHistory: history });
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  sendMessage(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, resolve);
    });
  }
}

// 初始化弹窗控制器
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});