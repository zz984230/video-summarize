// 测试新的Bilibili视频链接
const axios = require('axios');

// 使用新的BiliUrl类来测试
const { BiliUrl } = require('./dist/background.js');

async function testNewVideoLink() {
  console.log('=== 测试新的Bilibili视频链接 ===\n');
  
  const testUrl = 'https://www.bilibili.com/video/BV17w1UBLEKw/?spm_id_from=333.1007.tianma.2-2-5.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
  
  try {
    console.log('1. 创建BiliUrl实例...');
    const biliUrl = new BiliUrl();
    
    console.log('2. 提取BV号...');
    const bvid = biliUrl.extractBvid(testUrl);
    console.log('BV号:', bvid);
    
    console.log('3. 获取完整视频流信息...');
    const streamInfo = await biliUrl.getVideoStream(testUrl);
    console.log('视频信息:', {
      标题: streamInfo.title,
      BV号: streamInfo.bvid,
      CID: streamInfo.cid,
      类型: streamInfo.type,
      流数量: streamInfo.type === 'dash' ? 
        streamInfo.streams.video?.length : 
        streamInfo.streams.urls?.length
    });
    
    if (streamInfo.type === 'dash') {
      console.log('\n4. DASH视频流详情:');
      streamInfo.streams.video.forEach((video, index) => {
        console.log(`  视频 ${index + 1}: ${video.qualityText} (${video.codec}) - ${video.bandwidth}bps`);
        console.log(`    URL: ${video.url.substring(0, 80)}...`);
      });
      
      console.log('\n5. DASH音频流详情:');
      streamInfo.streams.audio.forEach((audio, index) => {
        console.log(`  音频 ${index + 1}: ${audio.codec} - ${audio.bandwidth}bps`);
        console.log(`    URL: ${audio.url.substring(0, 80)}...`);
      });
      
      // 获取最佳质量的视频流
      const bestVideo = streamInfo.streams.video.sort((a, b) => b.quality - a.quality)[0];
      const bestAudio = streamInfo.streams.audio.sort((a, b) => b.quality - a.quality)[0];
      
      console.log('\n6. 测试VL模型分析...');
      await testVLModelWithDashStream(streamInfo.title, bestVideo.url);
      
    } else if (streamInfo.type === 'flv') {
      console.log('\n4. FLV流详情:');
      streamInfo.streams.urls.forEach((urlInfo, index) => {
        console.log(`  片段 ${index + 1}: ${urlInfo.size}字节, ${urlInfo.length}ms`);
        console.log(`    URL: ${urlInfo.url.substring(0, 80)}...`);
      });
    }
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

async function testVLModelWithDashStream(title, videoUrl) {
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
testNewVideoLink();