import React, { useState } from 'react';
import { ModelConfig } from '../../types';

interface SettingsPanelProps {
  config: ModelConfig | null;
  onSave: (config: ModelConfig) => void;
  onTestConnection: (config: ModelConfig) => Promise<boolean>;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onSave,
  onTestConnection,
  onClose
}) => {
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl || 'https://api.openai.com');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [model, setModel] = useState(config?.model || 'gpt-4-vision-preview');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleSave = () => {
    if (!baseUrl || !apiKey) {
      alert('请填写完整的配置信息');
      return;
    }

    onSave({ baseUrl, apiKey, model });
  };

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey) {
      alert('请填写完整的配置信息');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTestConnection({ baseUrl, apiKey, model });
      setTestResult(result);
    } catch (error) {
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>模型配置</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="settings-content">
        <div className="form-group">
          <label htmlFor="baseUrl">Base URL:</label>
          <input
            id="baseUrl"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com"
          />
          <small>支持OpenAI兼容的API接口</small>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">API密钥:</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
          <small>您的API密钥将被安全存储</small>
        </div>

        <div className="form-group">
          <label htmlFor="model">模型名称:</label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4-vision-preview"
          />
          <small>使用的具体模型名称</small>
        </div>

        {testResult !== null && (
          <div className={`test-result ${testResult ? 'success' : 'error'}`}>
            {testResult ? '✅ 连接成功' : '❌ 连接失败'}
          </div>
        )}

        <div className="settings-actions">
          <button
            className="test-btn"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? '测试中...' : '测试连接'}
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
          >
            保存配置
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <h3>使用说明</h3>
        <ul>
          <li>支持OpenAI兼容的API接口</li>
          <li>可以自定义base_url以支持其他大模型服务</li>
          <li>API密钥将被加密存储在本地</li>
          <li>建议先测试连接再保存配置</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;