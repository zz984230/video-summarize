// 测试DASH到MP4转换功能
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
        pic: info.data.pic,
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

  async getDashManifest(bvid, cid, qn = 80) {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=4048&fourk=1`;
    console.log('请求DASH信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const data = response.data;
      
      if (data.code !== 0 || !data.data?.dash) {
        throw new Error('无法获取DASH信息');
      }
      
      const dash = data.data.dash;
      
      // 获取最高质量的视频流
      const videoStream = dash.video.sort((a, b) => b.id - a.id)[0];
      const audioStream = dash.audio.sort((a, b) => b.id - a.id)[0];
      
      console.log('DASH流信息:', {
        videoQuality: videoStream.id,
        audioQuality: audioStream.id,
        videoCodec: videoStream.codecs,
        audioCodec: audioStream.codecs,
        videoBandwidth: videoStream.bandwidth,
        audioBandwidth: audioStream.bandwidth
      });
      
      return {
        videoStream,
        audioStream,
        quality: this.getQualityText(videoStream.id)
      };
    } catch (error) {
      console.error('获取DASH信息失败:', error.message);
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

    // 获取DASH信息
    const dashInfo = await this.getDashManifest(bvid, videoInfo.cid, 80);
    
    return {
      bvid,
      ...videoInfo,
      ...dashInfo
    };
  }
}

// 测试DASH片段下载和转换
async function testDashSegments() {
  console.log('=== 测试DASH片段下载和转换 ===\n');
  
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  const tester = new BiliUrlTester();
  
  try {
    console.log('1. 提取视频信息和DASH流...');
    const result = await tester.getVideoStream(testUrl);
    
    console.log('\n=== 视频和DASH信息 ===');
    console.log('标题:', result.title);
    console.log('BV号:', result.bvid);
    console.log('CID:', result.cid);
    console.log('时长:', Math.floor(result.duration / 60) + '分' + (result.duration % 60) + '秒');
    console.log('画质:', result.quality);
    console.log('视频编码:', result.videoStream.codecs);
    console.log('音频编码:', result.audioStream.codecs);
    console.log('视频码率:', (result.videoStream.bandwidth / 1024).toFixed(0) + 'Kbps');
    console.log('音频码率:', (result.audioStream.bandwidth / 1024).toFixed(0) + 'Kbps');
    
    console.log('\n2. 分析DASH片段结构...');
    await analyzeDashStructure(result.videoStream, result.audioStream);
    
    console.log('\n3. 测试片段URL生成...');
    await testSegmentUrlGeneration(result.videoStream);
    
    console.log('\n4. 测试片段下载...');
    await testSegmentDownload(result.videoStream);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

async function analyzeDashStructure(videoStream, audioStream) {
  console.log('\n--- DASH流结构分析 ---');
  
  // 分析视频流
  console.log('视频基础URL:', videoStream.baseUrl.substring(0, 100) + '...');
  console.log('视频片段格式:', extractSegmentPattern(videoStream.baseUrl));
  
  // 分析音频流
  console.log('音频基础URL:', audioStream.baseUrl.substring(0, 100) + '...');
  console.log('音频片段格式:', extractSegmentPattern(audioStream.baseUrl));
  
  // 分析片段大小（估算）
  const videoSegmentSize = estimateSegmentSize(videoStream.bandwidth, 6); // 6秒片段
  const audioSegmentSize = estimateSegmentSize(audioStream.bandwidth, 6);
  
  console.log('视频片段大小(估算):', formatBytes(videoSegmentSize));
  console.log('音频片段大小(估算):', formatBytes(audioSegmentSize));
}

function extractSegmentPattern(url) {
  const match = url.match(/-(\d+)-(\d+)\.m4s$/);
  if (match) {
    return `片段格式: ${match[1]}-${match[2]}.m4s`;
  }
  return '未知格式';
}

function estimateSegmentSize(bandwidth, duration) {
  // bandwidth是bps，duration是秒
  return Math.floor((bandwidth * duration) / 8); // 转换为字节
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function testSegmentUrlGeneration(videoStream) {
  console.log('\n--- 片段URL生成测试 ---');
  
  const baseUrl = videoStream.baseUrl;
  const segments = [];
  
  // 生成前5个片段的URL
  for (let i = 1; i <= 5; i++) {
    const segmentUrl = baseUrl.replace(/-\d+-\d+\.m4s$/, `-${i}-30032.m4s`);
    segments.push({
      index: i,
      url: segmentUrl,
      preview: segmentUrl.substring(0, 80) + '...'
    });
  }
  
  segments.forEach(seg => {
    console.log(`片段${seg.index}: ${seg.preview}`);
  });
}

async function testSegmentDownload(videoStream) {
  console.log('\n--- 片段下载测试 ---');
  
  const testSegmentUrl = videoStream.baseUrl.replace(/-\d+-\d+\.m4s$/, '-1-30032.m4s');
  console.log('测试下载片段:', testSegmentUrl.substring(0, 80) + '...');
  
  try {
    const response = await fetch(testSegmentUrl, {
      headers: {
        'Referer': 'https://www.bilibili.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('HTTP状态:', response.status, response.statusText);
    console.log('内容类型:', response.headers.get('content-type'));
    console.log('内容长度:', response.headers.get('content-length'));
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('下载成功:', formatBytes(blob.size));
      
      // 验证是否为有效的M4S文件
      const arrayBuffer = await blob.slice(0, 32).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('前32字节:', Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // 检查MP4/M4S文件头
      const isValidM4S = checkM4SHeader(uint8Array);
      console.log('M4S文件格式验证:', isValidM4S ? '✅ 有效' : '❌ 可能无效');
    } else {
      console.log('下载失败:', response.statusText);
    }
    
  } catch (error) {
    console.error('下载错误:', error.message);
  }
}

function checkM4SHeader(data) {
  // 检查MP4/M4S文件特征
  // MP4文件通常以ftyp box开始
  const ftypSignature = [0x66, 0x74, 0x79, 0x70]; // "ftyp"
  
  // 在前32字节中查找ftyp
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === ftypSignature[0] && 
        data[i+1] === ftypSignature[1] && 
        data[i+2] === ftypSignature[2] && 
        data[i+3] === ftypSignature[3]) {
      return true;
    }
  }
  
  // 或者检查moof box (DASH分片特征)
  const moofSignature = [0x6D, 0x6F, 0x6F, 0x66]; // "moof"
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === moofSignature[0] && 
        data[i+1] === moofSignature[1] && 
        data[i+2] === moofSignature[2] && 
        data[i+3] === moofSignature[3]) {
      return true;
    }
  }
  
  return false;
}

// 运行测试
testDashSegments();