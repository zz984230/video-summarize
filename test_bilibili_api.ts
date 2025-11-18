// 研究Bilibili视频URL提取的测试脚本
import axios from 'axios';

// Bilibili视频信息API
// 根据bvid获取cid，然后获取视频流URL
async function getBilibiliVideoStream(bvid: string) {
  try {
    console.log(`尝试获取BVID: ${bvid} 的视频流信息...`);
    
    // 第一步：获取视频基本信息和cid
    const pageInfoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    console.log(`请求页面信息: ${pageInfoUrl}`);
    
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
    const duration = videoData.duration;
    
    console.log(`获取成功: ${title} (CID: ${cid}, 时长: ${duration}s)`);
    
    // 第二步：获取视频流URL
    const streamUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&type=&otype=json`;
    console.log(`请求视频流信息: ${streamUrl}`);
    
    const streamResponse = await axios.get(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://www.bilibili.com/video/${bvid}/`
      }
    });
    
    if (streamResponse.data.code !== 0) {
      throw new Error(`视频流API错误: ${streamResponse.data.message}`);
    }
    
    const streamData = streamResponse.data.data;
    const durl = streamData.durl;
    
    if (durl && durl.length > 0) {
      console.log('可用的视频流URL:');
      durl.forEach((urlInfo: any, index: number) => {
        console.log(`${index + 1}. ${urlInfo.url}`);
        console.log(`   大小: ${urlInfo.size} 字节`);
        console.log(`   时长: ${urlInfo.length} 毫秒`);
      });
      
      return {
        title,
        duration,
        videoUrls: durl.map((urlInfo: any) => urlInfo.url)
      };
    } else {
      console.log('未找到视频流URL');
      return null;
    }
    
  } catch (error) {
    console.error('获取视频流失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return null;
  }
}

// 测试
async function test() {
  const bvid = 'BV1yUyuB2EfM'; // 用户提供的测试视频
  const result = await getBilibiliVideoStream(bvid);
  
  if (result) {
    console.log('\n=== 测试结果 ===');
    console.log(`标题: ${result.title}`);
    console.log(`时长: ${result.duration}秒`);
    console.log(`视频流URL数量: ${result.videoUrls.length}`);
  }
}

test();