// 测试关键帧提取功能
const axios = require('axios');

// 模拟BiliUrl类的核心功能
class BiliUrlTester {
  constructor() {
    this.sess = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });
  }

  extractBvid(url) {
    const match = url.match(/(BV\w{10})/);
    return match ? match[1] : null;
  }

  async getCid(bvid) {
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    console.log('请求视频信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const info = response.data;
      
      if (info.code !== 0) {
        throw new Error(`API错误: ${info.message}`);
      }
      
      return {
        cid: info.data.cid,
        title: info.data.title,
        desc: info.data.desc,
        pic: info.data.pic, // 封面图片
        duration: info.data.duration,
        owner: info.data.owner.name,
        view: info.data.stat.view,
        danmaku: info.data.stat.danmaku
      };
    } catch (error) {
      console.error('获取cid失败:', error.message);
      throw error;
    }
  }

  async getFlvStream(bvid, cid, qn = 80) {
    // 尝试获取FLV格式的视频流（完整文件）
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=0&fourk=1`;
    console.log('请求FLV流信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const j = response.data;
      
      if (j.code !== 0) {
        throw new Error(`视频流API错误: ${j.message}`);
      }
      
      // 检查是否有FLV格式
      if (j.data && j.data.durl && j.data.durl.length > 0) {
        const flvUrl = j.data.durl[0].url;
        console.log('成功获取FLV流:', {
          quality: j.data.quality,
          format: j.data.format,
          size: (j.data.durl[0].size / 1024 / 1024).toFixed(2) + 'MB'
        });
        return flvUrl;
      }
      
      return null;
    } catch (error) {
      console.error('获取FLV流失败:', error.message);
      return null;
    }
  }

  async getVideoStream(url) {
    const bvid = this.extractBvid(url);
    if (!bvid) {
      throw new Error('无法从URL中提取BV号');
    }

    console.log(`提取到BV号: ${bvid}`);
    
    // 获取视频基本信息
    const videoInfo = await this.getCid(bvid);
    console.log(`获取视频信息: ${videoInfo.title} (CID: ${videoInfo.cid})`);

    // 尝试获取FLV格式
    const flvUrl = await this.getFlvStream(bvid, videoInfo.cid, 80);
    
    return {
      bvid,
      ...videoInfo,
      flvUrl,
      hasFlv: !!flvUrl
    };
  }
}

// 测试不同的视频格式和分析策略
async function testVideoFormatStrategies() {
  console.log('=== 测试视频格式转换策略 ===\n');
  
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  const tester = new BiliUrlTester();
  
  try {
    console.log('1. 提取视频信息和格式...');
    const result = await tester.getVideoStream(testUrl);
    
    console.log('\n=== 视频格式分析 ===');
    console.log('标题:', result.title);
    console.log('BV号:', result.bvid);
    console.log('CID:', result.cid);
    console.log('时长:', Math.floor(result.duration / 60) + '分' + (result.duration % 60) + '秒');
    console.log('是否有FLV格式:', result.hasFlv);
    
    if (result.flvUrl) {
      console.log('FLV视频流URL:', result.flvUrl.substring(0, 100) + '...');
      console.log('FLV格式大小: ~' + (result.duration * 0.5).toFixed(0) + 'MB (估算)');
    }
    
    console.log('\n2. 测试VL模型对不同格式的处理能力...');
    
    // 测试1: 封面图片分析
    console.log('\n--- 测试1: 封面图片分析 ---');
    await testImageAnalysis(result.title, result.pic);
    
    // 测试2: 如果有FLV格式，测试视频帧提取
    if (result.flvUrl) {
      console.log('\n--- 测试2: FLV视频帧提取分析 ---');
      await testVideoFrameAnalysis(result.title, result.flvUrl);
    }
    
    // 测试3: 文本信息分析（最可靠）
    console.log('\n--- 测试3: 综合文本分析 ---');
    await testComprehensiveTextAnalysis(result);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

async function testImageAnalysis(title, imageUrl) {
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
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: `视频标题：${title}\n请详细分析这张封面图片，推测视频的内容、类型和风格。`
              }
            ]
          }
        ],
        max_tokens: 800
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 封面分析结果:', content?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('✗ 封面分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

async function testVideoFrameAnalysis(title, videoUrl) {
  console.log('尝试分析FLV视频流...');
  console.log('注意：由于浏览器环境和跨域限制，这里模拟分析过程');
  
  const config = {
    baseURL: 'https://api-inference.modelscope.cn/v1/',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
    }
  };
  
  try {
    // 模拟关键帧分析
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
                text: `基于FLV视频流URL：${videoUrl.substring(0, 50)}...\n\n视频标题：${title}\n\n假设能够从这个完整视频文件中提取关键帧，请分析这个视频可能的内容特点、制作质量和观看价值。`
              }
            ]
          }
        ],
        max_tokens: 800
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 模拟视频帧分析结果:', content?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('✗ 视频帧分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

async function testComprehensiveTextAnalysis(videoInfo) {
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
                text: `请基于以下完整的B站视频信息进行深度分析：

📊 **视频元数据**：
- 标题：${videoInfo.title}
- 描述：${videoInfo.desc || '无描述'}
- UP主：${videoInfo.owner}
- 播放量：${videoInfo.view}
- 弹幕数：${videoInfo.danmaku}
- 时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒
- BV号：${videoInfo.bvid}

🎯 **多维度内容分析**：
1. 标题情感色彩和吸引力分析
2. 基于UP主信息和数据的受众画像
3. 结合播放量和弹幕数的互动性评估
4. 基于时长的内容密度预测
5. 视频类型和制作水准推测

请提供全面、专业、有洞察力的分析报告。`
              }
            ]
          }
        ],
        max_tokens: 1200
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 综合文本分析结果:', content?.substring(0, 400) + '...');
    
  } catch (error) {
    console.error('✗ 文本分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

// 运行测试
testVideoFormatStrategies();