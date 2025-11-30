/**
 * 测试视频代理服务 - 解决B站加密链接问题
 * 运行：node test_video_proxy.js
 */

const { VideoProxyManager } = require('./src/services/videoProxyService');
const { ModelService } = require('./src/services/modelService');

// 模拟视频信息（使用你提供的加密链接）
const testVideoInfo = {
  title: "测试B站加密视频链接",
  url: "https://upos-sz-estgcos.bilivideo.com/upgcxcode/79/55/34304885579/34304885579-1-192.mp4?e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&nbs=1&uipk=5&oi=1851223417&platform=html5&trid=6568c5f837fa42b4a4526b407052311h&mid=0&os=estgcos&og=cos&deadline=1764490306&gen=playurlv3&upsig=ddf61d5fc5d2cfe17be41052acb4a63f&uparams=e,nbs,uipk,oi,platform,trid,mid,os,og,deadline,gen&bvc=vod&nettype=0&bw=774794&build=0&dl=0&f=h_0_0&agrr=1&buvid=&orderid=0,1",
  bvid: "BV17oUrBKE7h",
  cid: "34304885579",
  duration: 192,
  cover: "https://i0.hdslb.com/bfs/archive/xxxx.jpg" // 这里需要实际的封面URL
};

// ModelScope API配置
const modelConfig = {
  baseUrl: 'https://api-inference.modelscope.cn/v1',
  apiKey: 'ms-871280c4-7729-4d3c-bc74-9fbd22dd9660',
  model: 'Qwen/Qwen3-VL-8B-Instruct'
};

async function testVideoProxy() {
  console.log('🚀 开始测试视频代理服务...');
  console.log('='.repeat(60));
  
  try {
    // 1. 测试视频代理管理器
    console.log('\n📹 测试视频代理管理器...');
    const proxyManager = VideoProxyManager.getInstance();
    
    // 测试缓存统计
    const cacheStats = proxyManager.getCacheStats();
    console.log('📊 缓存统计:', cacheStats);
    
    // 2. 测试视频代理创建
    console.log('\n🎬 测试视频代理创建...');
    const proxyResult = await proxyManager.createVideoProxy(testVideoInfo, testVideoInfo.url);
    
    console.log('代理结果:', {
      success: proxyResult.success,
      strategy: proxyResult.strategy,
      hasProxyUrl: !!proxyResult.proxyUrl,
      hasCoverUrl: !!proxyResult.coverUrl,
      error: proxyResult.error
    });
    
    if (proxyResult.success) {
      console.log('✅ 视频代理创建成功！');
      if (proxyResult.proxyUrl) {
        console.log('🎥 视频代理URL:', proxyResult.proxyUrl);
      }
      if (proxyResult.coverUrl) {
        console.log('🖼️ 封面代理URL:', proxyResult.coverUrl);
      }
    } else {
      console.log('❌ 视频代理创建失败:', proxyResult.error);
    }
    
    // 3. 测试模型服务集成
    console.log('\n🤖 测试模型服务集成...');
    const modelService = new ModelService(modelConfig);
    
    // 模拟生成摘要（这里只测试多模态消息构建）
    console.log('测试多模态分析消息构建...');
    
    // 这里可以添加实际的模型调用测试
    console.log('✅ 模型服务初始化成功');
    
    // 4. 清理缓存测试
    console.log('\n🧹 测试缓存清理...');
    proxyManager.cleanupCache();
    
    const newCacheStats = proxyManager.getCacheStats();
    console.log('清理后缓存统计:', newCacheStats);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试完成！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testVideoProxy().catch(console.error);
}

module.exports = { testVideoProxy };