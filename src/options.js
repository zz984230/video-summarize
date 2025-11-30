// 设置页面脚本
import { MultimodalAnalysisService } from './services/multimodal-analysis.js';

class OptionsController {
  constructor() {
    this.analysisService = new MultimodalAnalysisService();
    this.apiKey = '';
    this.init();
  }

  async init() {
    console.log('⚙️ 设置页面初始化');
    
    // 绑定事件
    this.bindEvents();
    
    // 加载保存的配置
    await this.loadConfiguration();
    
    // 初始状态检查
    this.updateConnectionStatus(false);
  }

  bindEvents() {
    // 测试连接按钮
    document.getElementById('testBtn').addEventListener('click', () => {
      this.testApiConnection();
    });

    // 保存配置按钮
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveConfiguration();
    });

    // 显示/隐藏密码
    document.getElementById('togglePassword').addEventListener('click', () => {
      this.togglePasswordVisibility();
    });

    // 输入框变化监听
    document.getElementById('apiKey').addEventListener('input', () => {
      this.apiKey = document.getElementById('apiKey').value;
      this.updateConnectionStatus(false);
    });
  }

  async loadConfiguration() {
    try {
      this.showStatus('正在加载配置...', 'loading');
      
      // 从存储中获取API密钥
      this.apiKey = await this.getStorage('apiKey');
      
      if (this.apiKey) {
        document.getElementById('apiKey').value = this.apiKey;
        console.log('✅ API密钥已加载');
      }
      
      this.hideStatus();
    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      this.showError('配置加载失败', error.message);
    }
  }

  async saveConfiguration() {
    try {
      const apiKeyInput = document.getElementById('apiKey').value.trim();
      
      if (!apiKeyInput) {
        this.showError('请输入API密钥');
        return;
      }

      this.showStatus('正在保存配置...', 'loading');

      // 保存API密钥
      await this.setStorage('apiKey', apiKeyInput);
      
      console.log('✅ 配置保存成功');
      this.hideStatus();
      this.showStatus('配置保存成功！', 'success');
      
      // 2秒后隐藏成功消息
      setTimeout(() => {
        this.hideStatus();
      }, 2000);
      
    } catch (error) {
      console.error('❌ 配置保存失败:', error);
      this.showError('配置保存失败', error.message);
    }
  }

  async testApiConnection() {
    try {
      const apiKeyInput = document.getElementById('apiKey').value.trim();
      
      if (!apiKeyInput) {
        this.showError('请先输入API密钥');
        return;
      }

      // 设置加载状态
      this.setTestingState(true);
      this.showStatus('正在测试连接...', 'loading');

      // 初始化分析服务
      this.analysisService.init(apiKeyInput);

      // 测试API密钥
      const isValid = await this.analysisService.analyzeVideo({
        videoUrl: 'https://example.com/test.mp4',
        title: '测试视频'
      }, 'summary');

      if (isValid && !isValid.error) {
        this.updateConnectionStatus(true);
        this.hideStatus();
        this.showStatus('API连接测试成功！', 'success');
      } else {
        this.updateConnectionStatus(false);
        throw new Error(isValid.error || 'API连接失败');
      }

    } catch (error) {
      console.error('❌ API测试失败:', error);
      this.updateConnectionStatus(false);
      this.hideStatus();
      this.showError('API测试失败', error.message);
    } finally {
      this.setTestingState(false);
    }
  }

  togglePasswordVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleBtn.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  }

  updateConnectionStatus(isConnected) {
    const indicator = document.getElementById('statusIndicator');
    const status = document.getElementById('connectionStatus');
    
    if (isConnected) {
      indicator.classList.add('connected');
      status.textContent = '已连接';
    } else {
      indicator.classList.remove('connected');
      status.textContent = '未连接';
    }
  }

  setTestingState(isTesting) {
    const button = document.getElementById('testBtn');
    const input = document.getElementById('apiKey');
    
    if (isTesting) {
      button.disabled = true;
      input.disabled = true;
      button.innerHTML = `
        <span class="loading-spinner"></span>
        测试中...
      `;
    } else {
      button.disabled = false;
      input.disabled = false;
      button.innerHTML = `
        <span class="btn-icon">🔍</span>
        测试连接
      `;
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
  }

  hideStatus() {
    document.getElementById('status').style.display = 'none';
  }

  showError(title, message) {
    const errorMessage = message ? `${title}: ${message}` : title;
    this.showStatus(errorMessage, 'error');
  }

  getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  setStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        resolve(true);
      });
    });
  }
}

// 初始化设置控制器
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});