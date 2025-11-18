const axios = require('axios');

// 测试ModelScope API配置
const config = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
  }
};

// 测试所有可用的Qwen VL模型
async function testAvailableVLModels() {
  console.log('测试所有可用的Qwen VL模型...');
  
  const vlModels = [
    'Qwen/Qwen3-VL-8B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct',
    'Qwen/Qwen2.5-VL-7B-Instruct',
    'Qwen/Qwen2.5-VL-3B-Instruct',
    'OpenGVLab/InternVL3_5-241B-A28B'
  ];
  
  const testVideoUrl = 'https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4';
  const testPrompt = '这个视频的主要内容是什么？请详细描述视频内容。';
  
  for (const model of vlModels) {
    console.log(`\n--- 测试模型: ${model} ---`);
    
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
                  video: testVideoUrl
                },
                {
                  type: 'text',
                  text: testPrompt
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
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

testAvailableVLModels();