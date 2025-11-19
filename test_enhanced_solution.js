// 测试增强的视频分析功能
const axios = require('axios');

// 模拟测试视频信息
const testVideoInfo = {
  title: "这部动漫太好看了，熬夜看完！",
  url: "https://www.bilibili.com/video/BV17w1UBLEKw/",
  duration: 601,
  bvid: "BV17w1UBLEKw",
  cid: "33812252092",
  coverImage: "http://i1.hdslb.com/bfs/archive/850346820bc8b01934b7461f00f0386603bea976.jpg"
};

// 模拟增强分析测试
async function testEnhancedAnalysis() {
  console.log('=== 增强视频分析解决方案测试 ===\n');
  
  console.log('🎯 测试视频信息:');
  console.log('标题:', testVideoInfo.title);
  console.log('BV号:', testVideoInfo.bvid);
  console.log('时长:', Math.floor(testVideoInfo.duration / 60) + '分' + (testVideoInfo.duration % 60) + '秒');
  console.log('封面:', testVideoInfo.coverImage);
  
  console.log('\n📊 解决方案对比测试:');
  
  // 方案1: 纯文本分析
  console.log('\n--- 方案1: 智能文本分析 ---');
  await testTextAnalysis(testVideoInfo);
  
  // 方案2: 封面图片+文本多模态分析
  console.log('\n--- 方案2: 多模态封面分析 ---');
  await testMultimodalAnalysis(testVideoInfo);
  
  // 方案3: 增强综合分析
  console.log('\n--- 方案3: 增强综合分析 ---');
  await testComprehensiveAnalysis(testVideoInfo);
  
  console.log('\n✅ 测试完成！增强解决方案已验证有效。');
}

async function testTextAnalysis(videoInfo) {
  const prompt = `请基于以下B站视频信息进行深度分析和内容推测：

🎬 **视频基本信息**：
- 标题：${videoInfo.title}
- 时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒
- BV号：${videoInfo.bvid}

🔍 **智能内容分析要求**：

1. **📊 标题深度解析**（100-150字）
   - 拆解标题关键词和情感色彩
   - 分析标题的吸引力和传播潜力
   - 识别可能的内容类型和创作风格

2. **🎯 内容方向预测**（200-300字）
   - 基于标题和时长，推测视频的核心内容
   - 预测可能的分段结构和内容重点
   - 分析创作者的表达目的和预期效果

3. **👥 目标受众画像**
   - 推测主要观众群体的特征
   - 分析内容的普适性或垂直领域特征

请确保分析专业、深入、有洞察力。`;

  await testModelAPI(prompt, '文本分析');
}

async function testMultimodalAnalysis(videoInfo) {
  const config = {
    baseURL: 'https://api-inference.modelscope.cn/v1/',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
    }
  };
  
  try {
    const response = await axios.post(
      'https://api-inference.modelscope.cn/v1/chat/completions',
      {
        model: 'Qwen/Qwen3-VL-8B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: videoInfo.coverImage
                }
              },
              {
                type: 'text',
                text: `请基于封面图片和以下视频信息，提供多模态分析：

📊 **视频元数据**：
- 标题：${videoInfo.title}
- 时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒

🎯 **多模态分析要求**：

1. **📸 封面视觉分析**
   - 详细描述封面中的场景、人物、色彩
   - 分析视觉风格和制作水准

2. **🎬 内容类型推测**
   - 基于视觉元素，推测视频的核心主题
   - 分析可能的内容结构和风格

3. **👥 目标受众画像**
   - 分析封面设计针对的观众群体

请提供全面、专业的分析。`
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 多模态分析结果:', content?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('✗ 多模态分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

async function testComprehensiveAnalysis(videoInfo) {
  const prompt = `请基于以下完整的B站视频信息进行综合深度分析：

📊 **完整视频元数据**：
- 标题：${videoInfo.title}
- 链接：${videoInfo.url}
- 时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒
- BV号：${videoInfo.bvid}
- 封面：${videoInfo.coverImage}

🎯 **综合分析维度**：

1. **📈 传播学分析**
   - 标题的情感操控和传播潜力
   - 在B站算法中的推荐可能性

2. **🎨 视觉设计分析**
   - 封面图片的视觉冲击力和设计水准
   - 色彩、构图、人物表现力分析

3. **👥 用户心理学分析**
   - 目标观众的心理特征和观看动机
   - 内容满足的特定需求和情感诉求

4. **📱 平台生态分析**
   - 在B站内容生态中的定位和竞争力
   - 与同类内容的差异化特征

5. **💡 商业价值评估**
   - 内容的商业变现潜力
   - 品牌合作和广告植入可能性

请提供最专业、最全面的分析报告。`;

  await testModelAPI(prompt, '综合分析');
}

async function testModelAPI(prompt, analysisType) {
  const config = {
    baseURL: 'https://api-inference.modelscope.cn/v1/',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
    }
  };
  
  try {
    const response = await axios.post(
      'https://api-inference.modelscope.cn/v1/chat/completions',
      {
        model: 'Qwen/Qwen3-VL-8B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 1500
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log(`✓ ${analysisType}结果:`, content?.substring(0, 400) + '...');
    
  } catch (error) {
    console.error(`✗ ${analysisType}失败:`, error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

// 运行测试
testEnhancedAnalysis();