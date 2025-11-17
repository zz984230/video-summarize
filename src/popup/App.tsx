import React, { useState, useEffect } from 'react';
import { VideoInfo, SummaryResult, ModelConfig } from '../types';
import { ModelService } from '../services/modelService';
import VideoInfoDisplay from './components/VideoInfoDisplay';
import SettingsPanel from './components/SettingsPanel';
import SummaryResultDisplay from './components/SummaryResultDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

const App: React.FC = () => {
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'settings' | 'history'>('summary');

  useEffect(() => {
    loadCurrentVideoInfo();
    loadModelConfig();
    loadLastProcessed();
  }, []);

  const loadCurrentVideoInfo = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
      if (response && typeof response === 'object' && 'success' in response && response.success && 'data' in response) {
        setCurrentVideo(response.data as VideoInfo);
      }
    } catch (error) {
      console.error('获取当前视频信息失败:', error);
      setError('无法获取当前页面视频信息');
    }
  };

  const loadModelConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
      if (response && typeof response === 'object' && 'success' in response && response.success && 'data' in response) {
        setModelConfig(response.data as ModelConfig);
      }
    } catch (error) {
      console.error('获取模型配置失败:', error);
    }
  };

  const loadLastProcessed = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getLastProcessed' });
      if (response && typeof response === 'object' && 'success' in response && response.success && 'data' in response) {
        setSummaryResult(response.data.result as SummaryResult);
      }
    } catch (error) {
      console.error('获取最后处理结果失败:', error);
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentVideo || !modelConfig) {
      setError('请先配置模型参数');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const modelService = new ModelService(modelConfig);
      const result = await modelService.generateSummary(currentVideo);
      
      setSummaryResult(result);
      
      // 保存结果到缓存
      const record = {
        url: currentVideo.url,
        result,
        timestamp: Date.now()
      };
      
      await chrome.runtime.sendMessage({
        action: 'saveResult',
        record
      });
    } catch (error) {
      console.error('生成摘要失败:', error);
      setError(error instanceof Error ? error.message : '生成摘要失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (config: ModelConfig) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'saveConfig',
        config
      });
      setModelConfig(config);
      setShowSettings(false);
      setError(null);
    } catch (error) {
      console.error('保存配置失败:', error);
      setError('保存配置失败');
    }
  };

  const handleTestConnection = async (): Promise<boolean> => {
    if (!modelConfig) return false;
    
    try {
      const modelService = new ModelService(modelConfig);
      return await modelService.testConnection();
    } catch (error) {
      return false;
    }
  };

  if (showSettings) {
    return (
      <div className="app">
        <SettingsPanel
          config={modelConfig}
          onSave={handleSaveConfig}
          onTestConnection={handleTestConnection}
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>B站视频摘要助手</h1>
        <button 
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="设置"
        >
          ⚙️
        </button>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          摘要
        </button>
        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          历史
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'summary' && (
          <>
            {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
            
            <VideoInfoDisplay videoInfo={currentVideo} />
            
            <div className="action-section">
              <button
                className="generate-btn"
                onClick={handleGenerateSummary}
                disabled={isLoading || !currentVideo || !modelConfig}
              >
                {isLoading ? '生成中...' : '生成摘要'}
              </button>
            </div>

            {isLoading && <LoadingSpinner />}
            
            {summaryResult && (
              <SummaryResultDisplay
                result={summaryResult}
                onClear={() => setSummaryResult(null)}
              />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h3>处理历史</h3>
            <p>历史记录功能开发中...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;