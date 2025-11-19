// 测试DASH流的.m4s视频文件是否能被VL模型处理
const axios = require('axios');

// 测试ModelScope API配置
const config = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
  }
};

async function testDashVideoWithVL() {
  console.log('=== 测试DASH .m4s视频流与VL模型 ===\n');
  
  // 这是从BV1yUyuB2EfM获取到的DASH视频流URL
  const dashVideoUrl = 'https://xy123x138x93x101xy.mcdn.bilivideo.cn:8082/v1/resource/34087503136-1-30032.m4s?agrr=0&build=0&buvid=2ED42D87-4b73-7b72-7ee6-9c4b94b795C031607infoc&bvc=vod&bw=76836&deadline=1763491631&e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&f=u_0_0&gen=playurlv3&mid=0&nbs=1&nettype=0&oi=2015662244&orderid=0,3&os=mcdn&platform=pc&sign=868856ccade809e206234d308a796170&traceId=trV1ym1gF0m1hr3b0c2lF0IV7CLzoIx2D2IKLy1lF0IV7CLzoIx2D2IKLy1lF0IV7CLzoIx2D2IKL&uc=0&upsig=868856ccade809e206234d308a796170&uparams=e,mid,deadline,uipk,trid,gen,os,oi,platform,nbs,og&bvc=vod&nettype=0&bw=76836&f=u_0_0&agrr=0&buvid=2ED42D87-4b73-7b72-7ee6-9c4b94b795C031607infoc';
  
  const models = [
    'Qwen/Qwen3-VL-8B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct'
  ];
  
  for (const model of models) {
    console.log(`\n--- 测试模型: ${model} ---`);
    console.log(`视频URL: ${dashVideoUrl.substring(0, 100)}...`);
    
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
                  video: dashVideoUrl
                },
                {
                  type: 'text',
                  text: '请详细描述这个视频的内容，包括场景、人物、动作、对话等。'
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
      console.log('响应:', content?.substring(0, 300) + '...');
      
    } catch (error) {
      console.error('✗ 失败:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
    
    // 等待一下避免频繁请求
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 运行测试
testDashVideoWithVL();