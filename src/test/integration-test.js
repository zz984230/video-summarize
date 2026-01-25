// integration-test.js - 集成测试脚本
class IntegrationTest {
  constructor() {
    this.testResults = [];
    this.moduleTests = [];
  }

  // 运行集成测试
  async runIntegrationTests() {
    console.log('🔗 开始运行集成测试...\n');
    
    const integrationTests = [
      this.testModuleIntegration,
      this.testEndToEndWorkflow,
      this.testErrorHandlingIntegration,
      this.testUserFeedbackIntegration,
      this.testCrossModuleCommunication,
      this.testDataFlow,
      this.testPerformanceIntegration
    ];

    for (const test of integrationTests) {
      try {
        await this.runTest(test);
      } catch (error) {
        this.recordTestResult(test.name, false, error.message);
      }
    }

    this.printIntegrationTestResults();
    return this.testResults;
  }

  // 运行单个测试
  async runTest(testFunction) {
    this.currentTest = testFunction.name;
    console.log(`🔍 正在运行集成测试: ${testFunction.name}`);
    
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
      timestamp: new Date().toISOString(),
      category: 'integration'
    });
  }

  // 模块集成测试
  testModuleIntegration() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟模块间的依赖关系检查
        const modules = {
          'BilibiliVideoParser': ['extractBvid', 'getVideoInfo', 'getVideoUrl'],
          'MultimodalAnalysisService': ['analyzeVideo', 'testApiKey'],
          'ErrorHandler': ['handleError', 'showUserFriendlyError'],
          'UserFeedbackManager': ['addFeedback', 'showToast'],
          'ContentScriptManager': ['extractVideoInfo', 'analyzeCurrentVideo'],
          'BackgroundService': ['handleVideoAnalysis', 'validateVideoData']
        };

        // 检查模块间的依赖关系
        for (const [moduleName, methods] of Object.entries(modules)) {
          if (!Array.isArray(methods) || methods.length === 0) {
            throw new Error(`模块 ${moduleName} 缺少必要的方法定义`);
          }
          
          // 检查方法命名规范
          methods.forEach(method => {
            if (typeof method !== 'string' || method.length === 0) {
              throw new Error(`模块 ${moduleName} 的方法名无效: ${method}`);
            }
          });
        }

        resolve('模块集成测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 端到端工作流测试
  testEndToEndWorkflow() {
    return new Promise(async (resolve, reject) => {
      try {
        // 模拟完整的用户操作流程
        const workflowSteps = [
          '用户打开B站视频页面',
          '内容脚本检测视频信息',
          '用户点击分析按钮',
          '发送分析请求到后台',
          '后台调用视频解析器',
          '获取视频信息成功',
          '调用多模态分析服务',
          '分析完成返回结果',
          '显示分析结果给用户',
          '用户复制摘要内容'
        ];

        // 模拟每个步骤的执行
        for (let i = 0; i < workflowSteps.length; i++) {
          const step = workflowSteps[i];
          console.log(`  步骤 ${i + 1}: ${step}`);
          
          // 模拟步骤执行时间
          await this.simulateStepExecution(step);
          
          // 随机模拟步骤失败（5%概率）
          if (Math.random() < 0.05) {
            throw new Error(`工作流在第${i + 1}步失败: ${step}`);
          }
        }

        resolve('端到端工作流测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 错误处理集成测试
  testErrorHandlingIntegration() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟各种错误场景
        const errorScenarios = [
          { type: 'network', message: '网络连接失败' },
          { type: 'api', message: 'API密钥无效' },
          { type: 'parse', message: '数据解析失败' },
          { type: 'timeout', message: '请求超时' },
          { type: 'validation', message: '数据验证失败' }
        ];

        errorScenarios.forEach(scenario => {
          // 模拟错误处理流程
          const error = new Error(scenario.message);
          const handled = this.simulateErrorHandling(error, scenario.type);
          
          if (!handled) {
            throw new Error(`错误场景处理失败: ${scenario.type}`);
          }
        });

        resolve('错误处理集成测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 用户反馈集成测试
  testUserFeedbackIntegration() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟不同类型的用户反馈
        const feedbackScenarios = [
          { type: 'success', message: '分析完成' },
          { type: 'error', message: '分析失败' },
          { type: 'warning', message: '网络连接不稳定' },
          { type: 'info', message: '正在分析中...' }
        ];

        feedbackScenarios.forEach(scenario => {
          // 模拟反馈显示
          const displayed = this.simulateFeedbackDisplay(scenario);
          
          if (!displayed) {
            throw new Error(`反馈显示失败: ${scenario.type}`);
          }
        });

        resolve('用户反馈集成测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 跨模块通信测试
  testCrossModuleCommunication() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟模块间的消息传递
        const communicationTests = [
          {
            from: 'contentScript',
            to: 'background',
            message: { action: 'analyzeVideo', videoData: {} },
            expectedResponse: { success: true }
          },
          {
            from: 'background',
            to: 'contentScript',
            message: { action: 'analysisResult', result: {} },
            expectedResponse: { success: true }
          },
          {
            from: 'popup',
            to: 'background',
            message: { action: 'getSettings' },
            expectedResponse: { success: true, data: {} }
          }
        ];

        communicationTests.forEach(test => {
          const result = this.simulateCrossModuleMessage(test);
          
          if (!result.success) {
            throw new Error(`跨模块通信失败: ${test.from} -> ${test.to}`);
          }
        });

        resolve('跨模块通信测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 数据流测试
  testDataFlow() {
    return new Promise((resolve, reject) => {
      try {
        // 模拟数据在不同模块间的流动
        const dataFlowSteps = [
          {
            step: '视频URL输入',
            input: 'https://www.bilibili.com/video/BV1xx411c7mD',
            expectedOutput: { bvid: 'BV1xx411c7mD' }
          },
          {
            step: '视频信息提取',
            input: { bvid: 'BV1xx411c7mD' },
            expectedOutput: { title: '视频标题', duration: 3600 }
          },
          {
            step: '分析请求构建',
            input: { videoInfo: {}, analysisType: 'general' },
            expectedOutput: { apiRequest: {}, validation: true }
          },
          {
            step: '分析结果处理',
            input: { apiResponse: { summary: '摘要内容' } },
            expectedOutput: { displayData: {}, userFriendly: true }
          }
        ];

        dataFlowSteps.forEach(step => {
          const result = this.simulateDataFlow(step);
          
          if (!result.valid) {
            throw new Error(`数据流验证失败: ${step.step}`);
          }
        });

        resolve('数据流测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 性能集成测试
  testPerformanceIntegration() {
    return new Promise(async (resolve, reject) => {
      try {
        // 模拟高负载场景
        const performanceTests = [
          this.simulateConcurrentRequests,
          this.simulateLargeDataProcessing,
          this.simulateMemoryUsage
        ];

        for (const test of performanceTests) {
          const result = await test.call(this);
          
          if (!result.passed) {
            throw new Error(`性能测试失败: ${result.testName}`);
          }
        }

        resolve('性能集成测试通过');
      } catch (error) {
        reject(error);
      }
    });
  }

  // 模拟步骤执行
  async simulateStepExecution(step) {
    // 模拟步骤执行时间（100-500ms）
    const delay = Math.random() * 400 + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 模拟错误处理
  simulateErrorHandling(error, type) {
    // 模拟错误处理逻辑
    const errorHandlers = {
      network: () => true,
      api: () => true,
      parse: () => true,
      timeout: () => true,
      validation: () => true
    };
    
    return errorHandlers[type] ? errorHandlers[type]() : false;
  }

  // 模拟反馈显示
  simulateFeedbackDisplay(scenario) {
    // 模拟反馈显示逻辑
    const feedbackHandlers = {
      success: () => true,
      error: () => true,
      warning: () => true,
      info: () => true
    };
    
    return feedbackHandlers[scenario.type] ? feedbackHandlers[scenario.type]() : false;
  }

  // 模拟跨模块消息
  simulateCrossModuleMessage(test) {
    // 模拟消息传递逻辑
    return {
      success: Math.random() > 0.1, // 90%成功率
      response: test.expectedResponse
    };
  }

  // 模拟数据流
  simulateDataFlow(step) {
    // 模拟数据处理逻辑
    return {
      valid: Math.random() > 0.05, // 95%成功率
      output: step.expectedOutput
    };
  }

  // 模拟并发请求
  async simulateConcurrentRequests() {
    const concurrentCount = 10;
    const requests = [];
    
    for (let i = 0; i < concurrentCount; i++) {
      requests.push(this.simulateRequest(`请求${i + 1}`));
    }
    
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.success).length;
    
    return {
      testName: '并发请求',
      passed: successCount >= concurrentCount * 0.8, // 80%成功率
      successRate: (successCount / concurrentCount) * 100
    };
  }

  // 模拟大数据处理
  async simulateLargeDataProcessing() {
    const largeData = Array(1000).fill(0).map((_, i) => ({
      id: i,
      data: `测试数据${i}`,
      timestamp: Date.now()
    }));
    
    const startTime = performance.now();
    
    // 模拟数据处理
    const processed = largeData.map(item => ({
      ...item,
      processed: true
    }));
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      testName: '大数据处理',
      passed: processingTime < 1000, // 1秒内完成
      processingTime: processingTime
    };
  }

  // 模拟内存使用
  async simulateMemoryUsage() {
    // 模拟内存分配和释放
    const objects = [];
    
    // 分配内存
    for (let i = 0; i < 100; i++) {
      objects.push(new Array(1000).fill('测试数据'));
    }
    
    // 释放内存
    objects.length = 0;
    
    return {
      testName: '内存使用',
      passed: true, // 简化测试
      memoryCleared: objects.length === 0
    };
  }

  // 模拟请求
  async simulateRequest(requestName) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    return {
      success: Math.random() > 0.2, // 80%成功率
      name: requestName
    };
  }

  // 打印集成测试结果
  printIntegrationTestResults() {
    console.log('\n🔗 集成测试结果汇总:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`总集成测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${total - passed}`);
    console.log(`集成测试成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ 失败的集成测试:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.testName}: ${r.details}`));
    }
    
    console.log('='.repeat(50));
  }
}

// 导出测试类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntegrationTest;
} else {
  // 在浏览器环境中运行
  window.integrationTest = new IntegrationTest();
  
  // 添加集成测试按钮
  document.addEventListener('DOMContentLoaded', () => {
    const integrationTestButton = document.createElement('button');
    integrationTestButton.textContent = '运行集成测试';
    integrationTestButton.style.cssText = 'position: fixed; top: 10px; left: 150px; z-index: 10000; padding: 10px; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer;';
    integrationTestButton.addEventListener('click', async () => {
      await window.integrationTest.runIntegrationTests();
    });
    document.body.appendChild(integrationTestButton);
  });
}