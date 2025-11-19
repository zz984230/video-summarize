// 测试视频内容分析和VL模型处理
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

  async getStream(bvid, cid, qn = 80) {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=4048&fourk=1`;
    console.log('请求DASH流信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const j = response.data;
      
      if (j.code !== 0) {
        throw new Error(`视频流API错误: ${j.message}`);
      }
      
      const dash = j.data.dash;
      if (!dash || !dash.video || !dash.audio) {
        throw new Error('无法获取DASH流数据');
      }
      
      // 获取最高画质的视频流
      const video = dash.video.sort((a, b) => b.id - a.id)[0];
      // 获取最高音质的音频流
      const audio = dash.audio.sort((a, b) => b.id - a.id)[0];
      
      console.log('成功获取DASH流:', {
        videoQuality: video.id,
        audioQuality: audio.id,
        videoCodec: video.codecs,
        audioCodec: audio.codecs
      });
      
      return {
        videoUrl: video.baseUrl,
        audioUrl: audio.baseUrl,
        quality: this.getQualityText(video.id),
        videoSize: video.size,
        audioSize: audio.size
      };
    } catch (error) {
      console.error('获取DASH流失败:', error.message);
      throw error;
    }
  }

  getQualityText(quality) {
    const qualityMap = {
      120: '4K超清',
      116: '1080P60帧',
      112: '1080P+',
      80: '1080P',
      74: '720P60帧',
      64: '720P',
      32: '480P',
      16: '360P'
    };
    return qualityMap[quality] || `${quality}P`;
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

    // 获取DASH流
    const stream = await this.getStream(bvid, videoInfo.cid, 80);
    
    return {
      bvid,
      ...videoInfo,
      ...stream
    };
  }
}

// 测试不同的分析策略
async function testComprehensiveAnalysis() {
  console.log('=== 综合视频内容分析测试 ===\n');
  
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  const tester = new BiliUrlTester();
  
  try {
    console.log('1. 提取完整视频信息...');
    const result = await tester.getVideoStream(testUrl);
    
    console.log('\n=== 视频基本信息 ===');
    console.log('标题:', result.title);
    console.log('描述:', result.desc);
    console.log('BV号:', result.bvid);
    console.log('CID:', result.cid);
    console.log('时长:', Math.floor(result.duration / 60) + '分' + (result.duration % 60) + '秒');
    console.log('UP主:', result.owner);
    console.log('播放量:', result.view);
    console.log('弹幕数:', result.danmaku);
    console.log('封面图片:', result.pic);
    console.log('画质:', result.quality);
    console.log('视频大小:', (result.videoSize / 1024 / 1024).toFixed(2) + 'MB');
    console.log('音频大小:', (result.audioSize / 1024 / 1024).toFixed(2) + 'MB');
    
    console.log('\n2. 测试不同分析策略...');
    
    // 策略1: 视频流直接分析
    console.log('\n--- 策略1: 直接视频流分析 ---');
    await testVideoAnalysis(result.title, result.videoUrl);
    
    // 策略2: 封面图片分析
    console.log('\n--- 策略2: 封面图片分析 ---');
    await testImageAnalysis(result.title, result.pic);
    
    // 策略3: 文本信息分析
    console.log('\n--- 策略3: 文本信息分析 ---');
    await testTextAnalysis(result.title, result.desc, result);
    
    // 策略4: 综合多模态分析
    console.log('\n--- 策略4: 综合多模态分析 ---');
    await testMultimodalAnalysis(result.title, result.pic, result);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

async function testVideoAnalysis(title, videoUrl) {
  const config = {
    baseURL: 'https://api-inference.modelscope.cn/v1/',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
    }
  };
  
  const models = ['Qwen/Qwen3-VL-8B-Instruct'];
  
  for (const model of models) {
    console.log(`使用模型: ${model}`);
    
    try {
      const response = await axios.post(
        'https://api-inference.modelscope.cn/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'video',
                  video: videoUrl
                },
                {
                  type: 'text',
                  text: `视频标题：${title}\n请详细分析这个视频的内容，包括场景、人物、情节、对话等。`
                }
              ]
            }
          ],
          max_tokens: 1000
        },
        config
      );
      
      const content = response.data.choices[0]?.message?.content;
      console.log('✓ 视频分析结果:', content?.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('✗ 视频分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
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
                type: 'image',
                image: imageUrl
              },
              {
                type: 'text',
                text: `视频标题：${title}\n请分析这张封面图片，推测视频可能的内容和类型。`
              }
            ]
          }
        ],
        max_tokens: 800
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 封面分析结果:', content?.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('✗ 封面分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

async function testTextAnalysis(title, description, videoInfo) {
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
                text: `基于以下视频信息，请分析这个视频可能的内容和类型：\n\n标题：${title}\n描述：${description}\nUP主：${videoInfo.owner}\n播放量：${videoInfo.view}\n弹幕数：${videoInfo.danmaku}\n时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒\n\n请推测视频的内容、类型和特点。`
              }
            ]
          }
        ],
        max_tokens: 800
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 文本分析结果:', content?.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('✗ 文本分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

async function testMultimodalAnalysis(title, imageUrl, videoInfo) {
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
                type: 'image',
                image: imageUrl
              },
              {
                type: 'text',
                text: `基于封面图片和以下信息，请综合分析这个视频：\n\n标题：${title}\nUP主：${videoInfo.owner}\n播放量：${videoInfo.view}\n弹幕数：${videoInfo.danmaku}\n时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒\n\n请提供视频的详细内容分析、类型判断和特点总结。`
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      config
    );
    
    const content = response.data.choices[0]?.message?.content;
    console.log('✓ 综合分析结果:', content?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('✗ 综合分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

// 运行测试
testComprehensiveAnalysis();