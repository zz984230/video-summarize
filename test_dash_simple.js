// 简单的DASH流测试
const axios = require('axios');

async function testDashStream() {
  console.log('=== 测试DASH流获取 ===\n');
  
  const bvid = 'BV1yUyuB2EfM';
  
  try {
    console.log('1. 获取视频基本信息...');
    const pageInfoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const pageResponse = await axios.get(pageInfoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });
    
    if (pageResponse.data.code !== 0) {
      throw new Error(`API错误: ${pageResponse.data.message}`);
    }
    
    const videoData = pageResponse.data.data;
    const cid = videoData.cid;
    const title = videoData.title;
    console.log('标题:', title);
    console.log('CID:', cid);
    
    console.log('\n2. 获取DASH流信息...');
    // 使用新的DASH API参数
    const dashUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=4048&fourk=1`;
    console.log('DASH API URL:', dashUrl);
    
    const dashResponse = await axios.get(dashUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://www.bilibili.com/video/${bvid}/`
      }
    });
    
    if (dashResponse.data.code !== 0) {
      throw new Error(`DASH API错误: ${dashResponse.data.message}`);
    }
    
    const dashData = dashResponse.data.data;
    console.log('DASH数据可用:', !!dashData.dash);
    
    if (dashData.dash && dashData.dash.video && dashData.dash.video.length > 0) {
      const videos = dashData.dash.video;
      const audios = dashData.dash.audio;
      
      console.log('\n3. 视频流信息:');
      videos.forEach((video, index) => {
        console.log(`  视频 ${index + 1}:`);
        console.log(`    画质: ${video.id}`);
        console.log(`    编码: ${video.codecs}`);
        console.log(`    带宽: ${video.bandwidth}`);
        console.log(`    URL: ${video.baseUrl.substring(0, 50)}...`);
      });
      
      console.log('\n4. 音频流信息:');
      audios.forEach((audio, index) => {
        console.log(`  音频 ${index + 1}:`);
        console.log(`    质量: ${audio.id}`);
        console.log(`    编码: ${audio.codecs}`);
        console.log(`    带宽: ${audio.bandwidth}`);
        console.log(`    URL: ${audio.baseUrl.substring(0, 50)}...`);
      });
      
      // 返回最高画质的视频流URL
      const bestVideo = videos.sort((a, b) => b.id - a.id)[0];
      const bestAudio = audios.sort((a, b) => b.id - a.id)[0];
      
      console.log('\n✅ 成功获取DASH流！');
      console.log('最佳视频流画质:', bestVideo.id);
      console.log('最佳音频流质量:', bestAudio.id);
      
      return {
        videoUrl: bestVideo.baseUrl,
        audioUrl: bestAudio.baseUrl,
        quality: bestVideo.id,
        duration: dashData.timelength
      };
    } else {
      console.log('❌ 未找到DASH流数据');
      return null;
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return null;
  }
}

// 运行测试
testDashStream().then(result => {
  if (result) {
    console.log('\n=== 测试结果 ===');
    console.log('视频URL:', result.videoUrl.substring(0, 100) + '...');
    console.log('音频URL:', result.audioUrl.substring(0, 100) + '...');
    console.log('时长:', result.duration + 'ms');
  }
});