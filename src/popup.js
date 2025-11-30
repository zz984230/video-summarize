// 弹窗界面脚本
import { BilibiliVideoParser } from './services/bilibili-parser.js';

class PopupController {
  constructor() {
    this.parser = new BilibiliVideoParser();
    this.currentTab = null;
    this.currentVideo = null;
    this.init();
  }

  async init() {
    console.log('🪟 弹窗界面初始化');
    
    // 获取当前标签页
    await this.getCurrentTab();
    
    // 绑定事件
    this.bindEvents();
    
    // 检查当前页面状态
    this.checkPageState();
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
    // 分析按钮
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      this.analyzeCurrentVideo();
    });

    // 复制按钮
    document.getElementById('copyBtn').addEventListener('click', () => {
      this.copyResult();
    });

    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.checkPageState();
    });

    // 底部链接
    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });
  }

  async checkPageState() {
    if (!this.currentTab || !this.currentTab.url) {
      this.showError('无法获取当前页面信息');
      return;
    }

    const isBilibiliVideo = this.currentTab.url.includes('/video/') && 
                           (this.currentTab.url.includes('BV') || this.currentTab.url.includes('av'));

    if (!isBilibiliVideo) {
      this.showError('请在B站视频页面使用此插件');
      this.hideVideoInfo();
      return;
    }

    this.showVideoInfo();
    
    try {
      // 解析视频信息
      const bvid = this.parser.extractBV(this.currentTab.url);
      if (bvid) {
        console.log('🔍 检测到视频 BV号:', bvid);
        await this.loadVideoInfo(bvid);
      }
    } catch (error) {
      console.error('❌ 视频信息加载失败:', error);
      this.showError('视频信息加载失败');
    }
  }

  async loadVideoInfo(bvid) {
    try {
      this.showStatus('正在获取视频信息...', 'loading');
      
      const videoInfo = await this.parser.getVideoInfo(bvid);
      const videoUrls = await this.parser.getVideoUrls(bvid);
      
      if (videoInfo && videoInfo.code === 0) {
        this.currentVideo = {
          bvid: bvid,
          title: videoInfo.data.title,
          owner: videoInfo.data.owner?.name || '未知作者',
          duration: videoInfo.data.duration,
          view: videoInfo.data.stat?.view || 0,
          pages: videoInfo.data.pages?.length || 1,
          playUrl: videoUrls.durl[0]?.url || ''
        };

        this.displayVideoInfo(this.currentVideo);
        this.hideStatus();
      } else {
        throw new Error('获取视频信息失败');
      }
    } catch (error) {
      console.error('❌ 视频信息加载失败:', error);
      this.showError('无法获取视频信息');
    }
  }

  displayVideoInfo(video) {
    const titleElement = document.getElementById('videoTitle');
    const ownerElement = document.getElementById('videoOwner');
    const durationElement = document.getElementById('videoDuration');
    const viewsElement = document.getElementById('videoViews');

    titleElement.textContent = video.title;
    ownerElement.textContent = `👤 ${video.owner}`;
    durationElement.textContent = `⏱️ ${this.formatDuration(video.duration)}`;
    viewsElement.textContent = `👀 ${this.formatNumber(video.view)}`;

    this.showVideoInfo();
  }

  async analyzeCurrentVideo() {
    if (!this.currentVideo) {
      this.showError('请先获取视频信息');
      return;
    }

    try {
      // 获取分析类型
      const analysisType = document.getElementById('analysisType').value;
      
      // 设置分析状态
      this.setAnalyzingState(true);
      this.showStatus('正在分析视频内容...', 'loading');

      // 准备分析数据
      const analysisData = {
        videoUrl: this.currentVideo.playUrl,
        title: this.currentVideo.title,
        owner: this.currentVideo.owner,
        duration: this.currentVideo.duration,
        view: this.currentVideo.view,
        pages: this.currentVideo.pages
      };

      // 发送分析请求到后台
      const response = await this.sendMessage('ANALYZE_VIDEO', {
        videoData: analysisData,
        analysisType: analysisType
      });

      if (response.success) {
        this.hideStatus();
        this.displayResult(response.summary);
        this.showCopyButton();
      } else {
        this.hideStatus();
        this.showError('分析失败', response.error || '未知错误');
      }

    } catch (error) {
      console.error('❌ 视频分析失败:', error);
      this.hideStatus();
      this.showError('分析失败', error.message);
    } finally {
      this.setAnalyzingState(false);
    }
  }

  displayResult(result) {
    const container = document.getElementById('resultContainer');
    const textElement = document.getElementById('resultText');

    textElement.textContent = result;
    container.style.display = 'block';
    
    // 滚动到结果区域
    container.scrollIntoView({ behavior: 'smooth' });
  }

  copyResult() {
    const text = document.getElementById('resultText').textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showStatus('结果已复制到剪贴板', 'success');
        setTimeout(() => this.hideStatus(), 2000);
      }).catch(() => {
        this.showError('复制失败');
      });
    }
  }

  showVideoInfo() {
    document.getElementById('videoInfo').style.display = 'block';
  }

  hideVideoInfo() {
    document.getElementById('videoInfo').style.display = 'none';
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
    setTimeout(() => this.hideStatus(), 5000);
  }

  setAnalyzingState(isAnalyzing) {
    const button = document.getElementById('analyzeBtn');
    const select = document.getElementById('analysisType');
    
    if (isAnalyzing) {
      button.disabled = true;
      select.disabled = true;
      button.innerHTML = `
        <span class="loading-spinner"></span>
        分析中...
      `;
    } else {
      button.disabled = false;
      select.disabled = false;
      button.innerHTML = `
        <span class="btn-icon">🔍</span>
        开始分析
      `;
    }
  }

  showCopyButton() {
    document.getElementById('copyBtn').style.display = 'block';
  }

  hideCopyButton() {
    document.getElementById('copyBtn').style.display = 'none';
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  sendMessage(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, resolve);
    });
  }

  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  formatNumber(num) {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    } else {
      return num.toString();
    }
  }
}

// 初始化弹窗控制器
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});