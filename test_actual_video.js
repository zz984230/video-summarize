const axios = require('axios');

// 测试ModelScope API配置
const config = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
  }
};

// 测试实际的Bilibili视频流URL
async function testActualVideoStream() {
  console.log('测试实际的Bilibili视频流URL...');
  
  // 这是从BV1yUyuB2EfM获取到的实际视频流URL
  const actualVideoUrl = 'https://upos-sz-mirrorbd.bilivideo.com/upgcxcode/36/31/34087503136/34087503136-1-192.mp4?e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&mid=0&deadline=1763491631&uipk=5&trid=7f03a77d6b8e4ec2b01a31181f1af88u&gen=playurlv3&os=bdbv&oi=2015662244&platform=pc&nbs=1&og=hw&upsig=868856ccade809e206234d308a796170&uparams=e,mid,deadline,uipk,trid,gen,os,oi,platform,nbs,og&bvc=vod&nettype=0&bw=768369&f=u_0_0&agrr=0&buvid=&build=0&dl=0&orderid=0,3';
  
  const models = [
    'Qwen/Qwen3-VL-8B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct'
  ];
  
  for (const model of models) {
    console.log(`\n--- 测试模型: ${model} ---`);
    console.log(`视频URL: ${actualVideoUrl.substring(0, 100)}...`);
    
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
                  video: actualVideoUrl
                },
                {
                  type: 'text',
                  text: '请描述这个视频的主要内容，包括场景、人物、动作等细节。'
                }
              ]
            }
          ],
          max_tokens: 1000
        },
        config
      );
      
      const content = response.data.choices[0]?.message?.content;
      console.log('✓ 成功!');
      console.log('响应:', content);
      
    } catch (error) {
      console.error('✗ 失败:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
    
    // 等待一下避免频繁请求
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testActualVideoStream();