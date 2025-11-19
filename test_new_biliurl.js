// 测试新的BiliUrl类和DASH流获取
const { BiliUrl } = require('./dist/background.js');

async function testBiliUrl() {
  console.log('=== 测试BiliUrl类 ===\n');
  
  const biliUrl = new BiliUrl();
  const testUrl = 'https://www.bilibili.com/video/BV1yUyuB2EfM/';
  
  try {
    console.log('1. 提取BV号...');
    const bvid = biliUrl.extractBvid(testUrl);
    console.log('BV号:', bvid);
    
    console.log('\n2. 获取视频基本信息...');
    const { cid, title } = await biliUrl.getCid(bvid);
    console.log('标题:', title);
    console.log('CID:', cid);
    
    console.log('\n3. 获取DASH流...');
    const dashStreams = await biliUrl.getStream(bvid, cid, 80);
    console.log('视频流URL:', dashStreams.videoUrl.substring(0, 100) + '...');
    console.log('音频流URL:', dashStreams.audioUrl.substring(0, 100) + '...');
    console.log('画质:', dashStreams.quality);
    
    console.log('\n4. 获取完整流信息...');
    const fullStreamInfo = await biliUrl.getVideoStream(testUrl);
    console.log('完整信息:', {
      bvid: fullStreamInfo.bvid,
      title: fullStreamInfo.title,
      cid: fullStreamInfo.cid,
      type: fullStreamInfo.type,
      streamCount: fullStreamInfo.type === 'dash' ? 
        fullStreamInfo.streams.video?.length : 
        fullStreamInfo.streams.urls?.length
    });
    
    console.log('\n✅ 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testBiliUrl();