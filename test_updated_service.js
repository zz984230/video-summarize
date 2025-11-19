// 测试更新后的模型服务实现
const { ModelService } = require('./dist/background.js');

// 模拟视频信息
const testVideoInfo = {
  title: "这部动漫太好看了，熬夜看完！",
  url: "https://www.bilibili.com/video/BV17w1UBLEKw/",
  duration: 601, // 10分1秒
  bvid: "BV17w1UBLEKw",
  cid: 33812252092
};

// 模拟配置
const config = {
  baseUrl: 'https://api-inference.modelscope.cn/v1/',
  apiKey: 'ms-871280c4-7729-4d3c-bc74-9fbd22dd9660',
  model: 'Qwen/Qwen3-VL-8B-Instruct'
};

async function testUpdatedModelService() {
  console.log('=== 测试更新后的模型服务 ===\n');
  
  try {
    console.log('1. 创建模型服务实例...');
    const modelService = new ModelService(config);
    
    console.log('2. 测试连接...');
    const connectionTest = await modelService.testConnection();
    console.log('连接测试结果:', connectionTest ? '✓ 成功' : '✗ 失败');
    
    if (connectionTest) {
      console.log('3. 生成视频摘要...');
      const summary = await modelService.generateSummary(testVideoInfo);
      
      console.log('\n=== 生成的摘要 ===');
      console.log('整体摘要:', summary.overall);
      console.log('分段数量:', summary.segments.length);
      
      if (summary.segments.length > 0) {
        console.log('第一段内容:', summary.segments[0].content);
        console.log('第一段关键要点:', summary.segments[0].keyPoints);
      }
      
      console.log('生成时间:', new Date(summary.timestamp).toLocaleString());
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testUpdatedModelService();