const axios = require('axios');

// 测试ModelScope API配置
const config = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
  }
};

// 测试不同类型的视频URL
async function testVideoUrls() {
  console.log('测试不同类型的视频URL...');
  
  const testCases = [
    {
      name: 'Bilibili页面URL',
      url: 'https://www.bilibili.com/video/BV1yUyuB2EfM/',
      description: '测试是否可以直接使用Bilibili页面URL'
    },
    {
      name: '示例视频URL',
      url: 'https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4',
      description: '测试官方示例视频URL'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log(`描述: ${testCase.description}`);
    console.log(`URL: ${testCase.url}`);
    
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
                  video: testCase.url
                },
                {
                  type: 'text',
                  text: '这个视频的主要内容是什么？'
                }
              ]
            }
          ],
          max_tokens: 1000
        },
        config
      );
      
      console.log('✓ 成功:', response.data.choices[0]?.message?.content?.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('✗ 失败:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
    
    // 等待一下避免频繁请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testVideoUrls();