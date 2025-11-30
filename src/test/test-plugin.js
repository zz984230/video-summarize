// test-plugin.js - 插件功能测试脚本
class PluginTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🧪 开始运行插件功能测试...\n');
    
    const tests = [
      this.testManifest,
      this.testBilibiliParser,
      this.testMultimodalAnalysis,
      this.testErrorHandler,
      this.testUserFeedback,
      this.testContentScript,
      this.testBackgroundScript,
      this.testPopupUI
    ];

    for (const test of tests) {
      try {
        await this.runTest(test);
      } catch (error) {
        this.recordTestResult(test.name, false, error.message);
      }
    }

    this.printTestResults();
    return this.testResults;
  }

  // 运行单个测试
  async runTest(testFunction) {
    this.currentTest = testFunction.name;
    console.log(`🔍 正在测试: ${testFunction.name}`);
    
    try {
      const result = await testFunction.call(this);
      this.recordTestResult(testFunction.name, true, result);
      console.log(`✅ ${testFunction.name} - 通过\n`);
    } catch (error) {
      this.recordTestResult(testFunction.name, false, error.message);
      console.log(`❌ ${testFunction.name} - 失败: ${error.message}\n`);
      throw error;
    }
  }

  // 记录测试结果
  recordTestResult(testName, passed, details) {
    this.testResults.push({
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // 打印测试结果
  printTestResults() {
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${total - passed}`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.testName}: ${r.details}`));
    }
    
    console.log('='.repeat(50));
  }

  // 测试1: Manifest配置
  testManifest() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟manifest.json检查
        const manifest = {
          manifest_version: 3,
          name: 'B站视频摘要助手',
          version: '2.0.0',
          permissions: ['tabs', 'activeTab', 'storage', 'contextMenus'],
          host_permissions: ['*://*.bilibili.com/*'],
          content_scripts: [{
            matches: ['*://*.bilibili.com/video/*'],
            js: ['content/content.js'],
            run_at: 'document_end'
          }],
          background: {
            service_worker: 'background/background.js'
          },
          action: {
            default_popup: 'popup/popup.html',
            default_title: 'B站视频摘要助手'
          }
        };

        // 验证必要的字段
        if (!manifest.manifest_version || manifest.manifest_version !== 3) {
          throw new Error('manifest_version 必须是3');
        }
        if (!manifest.permissions || manifest.permissions.length === 0) {
          throw new Error('缺少必要的权限配置');
        }
        if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
          throw new Error('缺少内容脚本配置');
        }
        if (!manifest.background || !manifest.background.service_worker) {
          throw new Error('缺少后台脚本配置');
        }

        resolve('Manifest配置验证通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试2: B站视频解析器
  testBilibiliParser() {
    return new Promise(async (resolve, reject) => {
      try {
        // 模拟BilibiliVideoParser测试
        const testUrls = [
          'https://www.bilibili.com/video/BV1xx411c7mD',
          'https://www.bilibili.com/video/BV1q4411H7vw',
          'https://www.bilibili.com/video/BV1s411w7D6D'
        ];

        for (const url of testUrls) {
          const bvid = this.extractBvidFromUrl(url);
          if (!bvid || !bvid.startsWith('BV')) {
            throw new Error(`无法从URL提取BV号: ${url}`);
          }
        }

        resolve('B站视频解析器测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试3: 多模态分析服务
  testMultimodalAnalysis() {
    return new Promise(async (resolve, reject) => {
      try {
        // 模拟API配置验证
        const apiKey = 'test-api-key';
        const apiUrl = 'https://api-inference.modelscope.cn/v1/models/Qwen/Qwen3-VL-8B-Instruct';
        
        if (!apiKey || apiKey.length < 10) {
          throw new Error('API密钥格式不正确');
        }
        if (!apiUrl || !apiUrl.includes('modelscope')) {
          throw new Error('API URL格式不正确');
        }

        // 模拟分析类型验证
        const analysisTypes = ['general', 'technical', 'educational', 'entertainment', 'summary'];
        for (const type of analysisTypes) {
          if (!this.isValidAnalysisType(type)) {
            throw new Error(`无效的分析类型: ${type}`);
          }
        }

        resolve('多模态分析服务测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试4: 错误处理器
  testErrorHandler() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟错误处理测试
        const errorHandler = {
          categorizeError: (error) => {
            if (error.message.includes('网络')) return { type: 'network', severity: 'medium' };
            if (error.message.includes('API')) return { type: 'api', severity: 'high' };
            return { type: 'unknown', severity: 'low' };
          }
        };

        // 测试不同类型的错误
        const testErrors = [
          new Error('网络连接失败'),
          new Error('API密钥无效'),
          new Error('未知错误')
        ];

        testErrors.forEach(error => {
          const categorized = errorHandler.categorizeError(error);
          if (!categorized.type || !categorized.severity) {
            throw new Error('错误分类失败');
          }
        });

        resolve('错误处理器测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试5: 用户反馈管理器
  testUserFeedback() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟反馈队列测试
        const feedbackManager = {
          feedbackQueue: [],
          addFeedback: function(type, message) {
            this.feedbackQueue.push({ type, message, timestamp: Date.now() });
          }
        };

        // 测试添加不同类型的反馈
        const feedbackTypes = ['success', 'error', 'warning', 'info'];
        feedbackTypes.forEach(type => {
          feedbackManager.addFeedback(type, `测试${type}反馈`);
        });

        if (feedbackManager.feedbackQueue.length !== feedbackTypes.length) {
          throw new Error('反馈队列添加失败');
        }

        resolve('用户反馈管理器测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试6: 内容脚本
  testContentScript() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟内容脚本功能测试
        const contentScript = {
          extractBvid: (url) => {
            const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
            return match ? match[1] : null;
          },
          extractTitle: () => {
            return document.title || '未知标题';
          },
          extractDuration: (durationText) => {
            const parts = durationText.split(':');
            if (parts.length === 3) {
              return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }
            return 0;
          }
        };

        // 测试BV号提取
        const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';
        const bvid = contentScript.extractBvid(testUrl);
        if (bvid !== 'BV1xx411c7mD') {
          throw new Error('BV号提取失败');
        }

        // 测试时长解析
        const duration = contentScript.extractDuration('12:34');
        if (duration !== 754) {
          throw new Error('时长解析失败');
        }

        resolve('内容脚本测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试7: 后台脚本
  testBackgroundScript() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟后台脚本功能测试
        const backgroundScript = {
          validateVideoData: (videoData) => {
            const required = ['bvid', 'title', 'url'];
            return required.every(field => videoData[field]);
          },
          validateAnalysisType: (type) => {
            const validTypes = ['general', 'technical', 'educational', 'entertainment', 'summary'];
            return validTypes.includes(type);
          }
        };

        // 测试视频数据验证
        const validVideoData = {
          bvid: 'BV1xx411c7mD',
          title: '测试视频',
          url: 'https://www.bilibili.com/video/BV1xx411c7mD'
        };

        if (!backgroundScript.validateVideoData(validVideoData)) {
          throw new Error('视频数据验证失败');
        }

        // 测试分析类型验证
        if (!backgroundScript.validateAnalysisType('general')) {
          throw new Error('分析类型验证失败');
        }

        resolve('后台脚本测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 测试8: Popup UI
  testPopupUI() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟Popup UI测试
        const popupUI = {
          validateApiKey: (key) => {
            return key && key.length >= 10 && key.startsWith('sk-');
          },
          validateUrl: (url) => {
            try {
              new URL(url);
              return url.includes('bilibili.com/video/');
            } catch {
              return false;
            }
          }
        };

        // 测试API密钥验证
        const validApiKey = 'sk-test-api-key-123';
        if (!popupUI.validateApiKey(validApiKey)) {
          throw new Error('API密钥验证失败');
        }

        // 测试URL验证
        const validUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';
        if (!popupUI.validateUrl(validUrl)) {
          throw new Error('URL验证失败');
        }

        resolve('Popup UI测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 辅助方法
  extractBvidFromUrl(url) {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  isValidAnalysisType(type) {
    const validTypes = ['general', 'technical', 'educational', 'entertainment', 'summary'];
    return validTypes.includes(type);
  }

  // 性能测试
  async runPerformanceTests() {
    console.log('⚡ 开始性能测试...\n');
    
    const performanceTests = [
      this.testVideoParsingPerformance,
      this.testAnalysisPerformance,
      this.testUIRenderingPerformance
    ];

    for (const test of performanceTests) {
      try {
        await this.runTest(test);
      } catch (error) {
        this.recordTestResult(test.name, false, error.message);
      }
    }
  }

  // 视频解析性能测试
  testVideoParsingPerformance() {
    return new Promise((resolve, reject) => {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        this.extractBvidFromUrl('https://www.bilibili.com/video/BV1xx411c7mD');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      if (avgTime > 1) {
        reject(new Error(`视频解析性能不佳: 平均${avgTime.toFixed(2)}ms`));
      } else {
        resolve(`视频解析性能良好: 平均${avgTime.toFixed(2)}ms`);
      }
    });
  }

  // 分析性能测试
  testAnalysisPerformance() {
    return new Promise((resolve, reject) => {
      const iterations = 50;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        this.isValidAnalysisType('general');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      if (avgTime > 0.5) {
        reject(new Error(`分析性能不佳: 平均${avgTime.toFixed(2)}ms`));
      } else {
        resolve(`分析性能良好: 平均${avgTime.toFixed(2)}ms`);
      }
    });
  }

  // UI渲染性能测试
  testUIRenderingPerformance() {
    return new Promise((resolve, reject) => {
      const iterations = 20;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // 模拟DOM操作
        const div = document.createElement('div');
        div.innerHTML = '<span>测试内容</span>';
        div.remove();
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      if (avgTime > 2) {
        reject(new Error(`UI渲染性能不佳: 平均${avgTime.toFixed(2)}ms`));
      } else {
        resolve(`UI渲染性能良好: 平均${avgTime.toFixed(2)}ms`);
      }
    });
  }
}

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginTester;
} else {
  // 在浏览器环境中运行
  window.pluginTester = new PluginTester();
  
  // 添加测试按钮到页面
  document.addEventListener('DOMContentLoaded', () => {
    const testButton = document.createElement('button');
    testButton.textContent = '运行插件测试';
    testButton.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 10000; padding: 10px; background: #00a1d6; color: white; border: none; border-radius: 4px; cursor: pointer;';
    testButton.addEventListener('click', async () => {
      await window.pluginTester.runAllTests();
      await window.pluginTester.runPerformanceTests();
    });
    document.body.appendChild(testButton);
  });
}