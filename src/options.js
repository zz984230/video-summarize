// 设置页面脚本
class OptionsController {
  constructor() {
    this.apiKey = '';
    this.apiUrl = '';
    this.modelId = '';
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
    const testBtn = document.getElementById('testBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testApiConnection();
      });
    }

    // 保存配置按钮
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveConfiguration();
      });
    }

    // 显示/隐藏密码
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        this.togglePasswordVisibility();
      });
    }

    // 输入框变化监听
    const apiKeyInput = document.getElementById('apiKey');
    const apiUrlInput = document.getElementById('apiUrl');
    const modelIdInput = document.getElementById('modelId');
    
    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', () => {
        this.apiKey = apiKeyInput.value;
        this.updateConnectionStatus(false);
      });
    }

    if (apiUrlInput) {
      apiUrlInput.addEventListener('input', () => {
        this.apiUrl = apiUrlInput.value;
        this.updateConnectionStatus(false);
      });
    }

    if (modelIdInput) {
      modelIdInput.addEventListener('input', () => {
        this.modelId = modelIdInput.value;
        this.updateConnectionStatus(false);
      });
    }
  }

  async loadConfiguration() {
    try {
      this.showStatus('正在加载配置...', 'loading');
      
      // 从存储中获取配置
      const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId']);
      
      this.apiKey = result.apiKey || '';
      this.apiUrl = result.apiUrl || 'https://api-inference.modelscope.cn/v1';
      this.modelId = result.modelId || 'Qwen/Qwen3-VL-8B-Instruct';
      
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

  async saveConfiguration() {
    try {
      const apiKeyInput = document.getElementById('apiKey');
      const apiUrlInput = document.getElementById('apiUrl');
      const modelIdInput = document.getElementById('modelId');
      
      if (!apiKeyInput || !apiUrlInput || !modelIdInput) {
        this.showError('表单元素未找到');
        return;
      }
      
      const apiKey = apiKeyInput.value.trim();
      const apiUrl = apiUrlInput.value.trim();
      const modelId = modelIdInput.value.trim();
      
      if (!apiKey) {
        this.showError('请输入API密钥');
        return;
      }

      if (!apiUrl) {
        this.showError('请输入API地址');
        return;
      }

      if (!modelId) {
        this.showError('请输入模型ID');
        return;
      }

      this.showStatus('正在保存配置...', 'loading');

      // 保存所有配置到Chrome存储
      await chrome.storage.sync.set({
        apiKey: apiKey,
        apiUrl: apiUrl,
        modelId: modelId
      });
      
      // 更新本地状态
      this.apiKey = apiKey;
      this.apiUrl = apiUrl;
      this.modelId = modelId;
      
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
      const apiKeyInput = document.getElementById('apiKey');
      const apiUrlInput = document.getElementById('apiUrl');
      const modelIdInput = document.getElementById('modelId');
      
      if (!apiKeyInput || !apiUrlInput || !modelIdInput) {
        this.showError('表单元素未找到');
        return;
      }
      
      const apiKey = apiKeyInput.value.trim();
      const apiUrl = apiUrlInput.value.trim();
      const modelId = modelIdInput.value.trim();
      
      if (!apiKey) {
        this.showError('请先输入API密钥');
        return;
      }

      if (!apiUrl) {
        this.showError('请先输入API地址');
        return;
      }

      if (!modelId) {
        this.showError('请先输入模型ID');
        return;
      }

      // 设置加载状态
      this.setTestingState(true);
      this.showStatus('正在测试连接...', 'loading');

      // 测试API连接
      const testResponse = await this.testApi(apiKey, apiUrl, modelId);

      if (testResponse) {
        this.updateConnectionStatus(true);
        this.hideStatus();
        this.showStatus('API连接测试成功！', 'success');
      } else {
        this.updateConnectionStatus(false);
        throw new Error('API连接失败');
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

  async testApi(apiKey, apiUrl, modelId) {
    try {
      const testMessage = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "你好，测试连接"
              }
            ]
          }
        ],
        max_tokens: 50
      };

      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(testMessage)
      });

      return response.ok;
    } catch (error) {
      console.error('API测试请求失败:', error);
      return false;
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
    
    if (indicator && status) {
      if (isConnected) {
        indicator.classList.add('connected');
        status.textContent = '已连接';
      } else {
        indicator.classList.remove('connected');
        status.textContent = '未连接';
      }
    }
  }

  setTestingState(isTesting) {
    const button = document.getElementById('testBtn');
    const input = document.getElementById('apiKey');
    
    if (button && input) {
      if (isTesting) {
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span>测试中...';
        input.disabled = true;
      } else {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">🔍</span>测试连接';
        input.disabled = false;
      }
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      statusElement.style.display = 'block';
    }
  }

  hideStatus() {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.style.display = 'none';
    }
  }

  showError(title, message) {
    const errorMessage = message ? `${title}: ${message}` : title;
    this.showStatus(errorMessage, 'error');
  }
}

// 初始化控制器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
  });
} else {
  new OptionsController();
}