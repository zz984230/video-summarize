// 直接测试BiliUrl核心功能
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
        title: info.data.title
      };
    } catch (error) {
      console.error('获取cid失败:', error.message);
      throw error;
    }
  }

  async getStream(bvid, cid, qn = 80) {
    // 使用新的DASH API参数
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
        quality: this.getQualityText(video.id)
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
    const { cid, title } = await this.getCid(bvid);
    console.log(`获取视频信息: ${title} (CID: ${cid})`);

    // 获取DASH流
    const stream = await this.getStream(bvid, cid, 80);
    
    return {
      bvid,
      title,
      cid,
      ...stream
    };
  }
}

// 测试新的视频链接
async function testVideoStreamExtraction() {
  console.log('=== 测试Bilibili视频流提取 ===\n');
  
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  const tester = new BiliUrlTester();
  
  try {
    console.log('1. 提取视频流信息...');
    const result = await tester.getVideoStream(testUrl);
    
    console.log('\n=== 提取结果 ===');
    console.log('标题:', result.title);
    console.log('BV号:', result.bvid);
    console.log('CID:', result.cid);
    console.log('画质:', result.quality);
    console.log('视频流URL:', result.videoUrl.substring(0, 100) + '...');
    console.log('音频流URL:', result.audioUrl.substring(0, 100) + '...');
    
    console.log('\n2. 测试VL模型分析...');
    await testVLModelAnalysis(result.title, result.videoUrl);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

async function testVLModelAnalysis(title, videoUrl) {
  const config = {
    baseURL: 'https://api-inference.modelscope.cn/v1/',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
    }
  };
  
  const models = [
    'Qwen/Qwen3-VL-8B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct'
  ];
  
  for (const model of models) {
    console.log(`\n--- 使用模型: ${model} ---`);
    
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
      console.log('✓ VL模型分析结果:');
      console.log(content?.substring(0, 300) + '...');
      
    } catch (error) {
      console.error('✗ VL模型分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
    
    // 等待一下避免频繁请求
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 运行测试
testVideoStreamExtraction();