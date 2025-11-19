// 完整的DASH到MP4转换和VL模型分析测试
const axios = require('axios');

// 模拟BiliUrl类
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
    const response = await this.sess.get(url);
    const info = response.data;
    
    if (info.code !== 0) {
      throw new Error(`API错误: ${info.message}`);
    }
    
    return {
      cid: info.data.cid,
      title: info.data.title,
      desc: info.data.desc,
      pic: info.data.pic,
      duration: info.data.duration,
      owner: info.data.owner.name,
      view: info.data.stat.view,
      danmaku: info.data.stat.danmaku
    };
  }

  async getDashManifest(bvid, cid) {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=4048&fourk=1`;
    const response = await this.sess.get(url);
    const data = response.data;
    
    if (data.code !== 0 || !data.data?.dash) {
      throw new Error('无法获取DASH信息');
    }
    
    const dash = data.data.dash;
    const videoStream = dash.video.sort((a, b) => b.id - a.id)[0];
    const audioStream = dash.audio.sort((a, b) => b.id - a.id)[0];
    
    return {
      videoStream,
      audioStream,
      quality: this.getQualityText(videoStream.id)
    };
  }

  getQualityText(quality) {
    const qualityMap = {
      120: '4K超清', 116: '1080P60帧', 112: '1080P+', 80: '1080P',
      74: '720P60帧', 64: '720P', 32: '480P', 16: '360P'
    };
    return qualityMap[quality] || `${quality}P`;
  }

  async getVideoStream(url) {
    const bvid = this.extractBvid(url);
    if (!bvid) throw new Error('无法从URL中提取BV号');

    const videoInfo = await this.getCid(bvid);
    const dashInfo = await this.getDashManifest(bvid, videoInfo.cid);
    
    return { bvid, ...videoInfo, ...dashInfo };
  }
}

// DASH到MP4转换器
class DashToMp4Converter {
  static async convertDashSegments(videoInfo, maxSegments = 3) {
    try {
      console.log(`🔄 开始DASH到MP4转换（前${maxSegments}个片段）...`);
      
      const { videoStream, audioStream } = videoInfo;
      
      // 构建片段URL
      const videoSegments = this.buildSegmentUrls(videoStream.baseUrl, maxSegments);
      const audioSegments = this.buildSegmentUrls(audioStream.baseUrl, maxSegments);
      
      console.log('📥 下载视频片段...');
      const videoData = await this.downloadSegments(videoSegments);
      
      console.log('📥 下载音频片段...');
      const audioData = await this.downloadSegments(audioSegments);
      
      if (videoData.length === 0 || audioData.length === 0) {
        throw new Error('片段下载失败');
      }
      
      console.log('🔧 合并为MP4格式...');
      
      // 创建合并的Blob
      const videoBlob = this.combineSegments(videoData, 'video/mp4');
      const audioBlob = this.combineSegments(audioData, 'audio/mp4');
      
      // 创建对象URL
      const videoUrl = URL.createObjectURL(videoBlob);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const duration = maxSegments * 6; // 估算时长
      
      console.log(`✅ 转换成功！视频: ${(videoBlob.size / 1024 / 1024).toFixed(1)}MB, 音频: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB`);
      
      return {
        videoUrl,
        audioUrl,
        videoBlob,
        audioBlob,
        duration,
        segmentCount: videoData.length,
        conversionSuccess: true
      };
      
    } catch (error) {
      console.error('❌ DASH转换失败:', error.message);
      return null;
    }
  }
  
  static buildSegmentUrls(baseUrl, count) {
    const segments = [];
    for (let i = 1; i <= count; i++) {
      const segmentUrl = baseUrl.replace(/-\d+-\d+\.m4s$/, `-${i}-30032.m4s`);
      segments.push(segmentUrl);
    }
    return segments;
  }
  
  static async downloadSegments(urls) {
    const results = [];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'Referer': 'https://www.bilibili.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const data = await response.arrayBuffer();
          results.push(data);
          console.log(`  ✅ 下载成功: ${(data.byteLength / 1024).toFixed(1)}KB`);
        } else {
          console.log(`  ❌ 下载失败: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ 下载错误: ${error.message}`);
      }
    }
    
    return results;
  }
  
  static combineSegments(segmentData, mimeType) {
    let totalSize = 0;
    for (const segment of segmentData) {
      totalSize += segment.byteLength;
    }
    
    const combined = new ArrayBuffer(totalSize);
    const view = new Uint8Array(combined);
    
    let offset = 0;
    for (const segment of segmentData) {
      view.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
    }
    
    return new Blob([combined], { type: mimeType });
  }
  
  static cleanup(urls) {
    urls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
  }
}

// VL模型分析器
class VLModelAnalyzer {
  static async analyzeVideo(videoInfo, mp4Data) {
    console.log('🤖 开始VL模型视频分析...');
    
    const config = {
      baseURL: 'https://api-inference.modelscope.cn/v1/',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
      }
    };
    
    try {
      // 测试视频分析
      const videoResponse = await this.testVideoAnalysis(videoInfo, mp4Data.videoUrl, config);
      
      // 测试音频分析（可选）
      const audioResponse = await this.testAudioAnalysis(videoInfo, mp4Data.audioUrl, config);
      
      return {
        videoAnalysis: videoResponse,
        audioAnalysis: audioResponse,
        analysisComplete: true
      };
      
    } catch (error) {
      console.error('❌ VL模型分析失败:', error.message);
      return {
        videoAnalysis: null,
        audioAnalysis: null,
        analysisComplete: false,
        error: error.message
      };
    }
  }
  
  static async testVideoAnalysis(videoInfo, videoUrl, config) {
    console.log('📹 测试视频内容分析...');
    
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
                  type: 'video',
                  video: videoUrl
                },
                {
                  type: 'text',
                  text: `请详细分析这个MP4视频的内容。视频标题：${videoInfo.title}，时长约${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒。请提供：

1. 视频整体内容摘要（200-300字）
2. 主要场景和人物描述
3. 关键情节或转折点
4. 视频制作质量和风格评价
5. 内容价值和观看建议`
                }
              ]
            }
          ],
          max_tokens: 1500
        },
        config
      );
      
      const content = response.data.choices[0]?.message?.content;
      console.log('✅ 视频分析成功');
      return content;
      
    } catch (error) {
      console.log('❌ 视频分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
      return null;
    }
  }
  
  static async testAudioAnalysis(videoInfo, audioUrl, config) {
    console.log('🎵 测试音频内容分析...');
    
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
                  type: 'video',
                  video: audioUrl
                },
                {
                  type: 'text',
                  text: `请分析这个音频内容：背景音乐风格、人声对话、音效运用等。视频标题：${videoInfo.title}`
                }
              ]
            }
          ],
          max_tokens: 800
        },
        config
      );
      
      const content = response.data.choices[0]?.message?.content;
      console.log('✅ 音频分析成功');
      return content;
      
    } catch (error) {
      console.log('❌ 音频分析失败:', error.response?.status, error.response?.data?.error?.message || error.message);
      return null;
    }
  }
}

// 完整测试流程
async function testCompleteDashToMp4Workflow() {
  console.log('🚀 === 完整DASH到MP4转换和VL模型分析测试 ===\n');
  
  const tester = new BiliUrlTester();
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  
  try {
    // 步骤1: 获取视频信息
    console.log('📋 步骤1: 获取视频信息...');
    const videoInfo = await tester.getVideoStream(testUrl);
    console.log(`✅ 获取成功: ${videoInfo.title} (${videoInfo.quality})`);
    
    // 步骤2: DASH到MP4转换
    console.log('\n🔄 步骤2: DASH到MP4转换...');
    const mp4Data = await DashToMp4Converter.convertDashSegments(videoInfo, 2); // 使用前2个片段
    
    if (!mp4Data) {
      throw new Error('DASH转换失败');
    }
    
    console.log(`✅ 转换成功: ${mp4Data.duration}秒视频, ${mp4Data.segmentCount}个片段`);
    
    // 步骤3: VL模型分析
    console.log('\n🤖 步骤3: VL模型分析...');
    const analysisResult = await VLModelAnalyzer.analyzeVideo(videoInfo, mp4Data);
    
    // 步骤4: 结果展示
    console.log('\n📊 === 分析结果 ===');
    
    if (analysisResult.videoAnalysis) {
      console.log('\n🎬 视频内容分析:');
      console.log(analysisResult.videoAnalysis.substring(0, 500) + '...');
    }
    
    if (analysisResult.audioAnalysis) {
      console.log('\n🎵 音频内容分析:');
      console.log(analysisResult.audioAnalysis.substring(0, 300) + '...');
    }
    
    // 步骤5: 清理资源
    console.log('\n🧹 步骤5: 清理资源...');
    DashToMp4Converter.cleanup([mp4Data.videoUrl, mp4Data.audioUrl]);
    console.log('✅ 清理完成');
    
    console.log('\n🎉 === 测试完成！===');
    console.log(`转换状态: ${mp4Data.conversionSuccess ? '✅ 成功' : '❌ 失败'}`);
    console.log(`分析状态: ${analysisResult.analysisComplete ? '✅ 成功' : '❌ 失败'}`);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
testCompleteDashToMp4Workflow();