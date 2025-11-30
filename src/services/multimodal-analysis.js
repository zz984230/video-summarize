// 多模态模型视频分析服务
export class MultimodalAnalysisService {
  constructor() {
    this.baseUrl = 'https://api-inference.modelscope.cn/v1';
    this.defaultModel = 'Qwen/Qwen3-VL-8B-Instruct';
    this.apiKey = null;
    this.maxTokens = 1000;
    this.temperature = 0.7;
  }

  /**
   * 初始化服务
   * @param {string} apiKey - API密钥
   */
  init(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * 分析视频内容
   * @param {Object} videoData - 视频数据
   * @param {string} analysisType - 分析类型
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeVideo(videoData, analysisType = 'general') {
    if (!this.apiKey) {
      throw new Error('API密钥未设置');
    }

    if (!videoData || !videoData.videoUrl) {
      throw new Error('视频数据不完整');
    }

    try {
      console.log('🤖 开始多模态模型视频分析...');
      console.log(`📹 视频标题: ${videoData.title || '未知标题'}`);
      console.log(`🔗 视频地址: ${videoData.videoUrl}`);
      console.log(`🔍 分析类型: ${analysisType}`);

      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(videoData, analysisType);
      
      // 构建请求内容
      const content = [
        {
          type: 'video_url',
          video_url: videoData.videoUrl
        },
        {
          type: 'text',
          text: prompt
        }
      ];

      const requestBody = {
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`多模态模型API请求失败: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (data.error) {
        throw new Error(`多模态模型API返回错误: ${data.error.message}`);
      }

      const analysisResult = data.choices[0].message.content;
      
      console.log('✅ 多模态模型分析成功完成');
      
      return {
        success: true,
        summary: analysisResult,
        model: this.defaultModel,
        videoData: videoData,
        analysisType: analysisType,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ 多模态模型分析失败:', error);
      return {
        success: false,
        error: error.message,
        videoData: videoData,
        analysisType: analysisType,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 构建分析提示词
   * @param {Object} videoData - 视频数据
   * @param {string} analysisType - 分析类型
   * @returns {string} 提示词
   */
  buildAnalysisPrompt(videoData, analysisType) {
    const baseInfo = {
      title: videoData.title || '未知标题',
      owner: videoData.owner || '未知作者',
      duration: videoData.duration || 0,
      view: videoData.view || 0,
      pages: videoData.pages || 1
    };

    const prompts = {
      general: `请详细分析这个视频的内容。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${this.formatDuration(baseInfo.duration)}，播放量${baseInfo.view}。请提供：
1. 视频的主要内容摘要
2. 关键信息和要点
3. 视频的结构和逻辑
4. 适合观看的受众群体
5. 内容的价值和意义`,

      technical: `请从技术角度分析这个视频。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${this.formatDuration(baseInfo.duration)}。请重点关注：
1. 涉及的技术概念和原理
2. 技术实现的关键步骤
3. 代码或操作的技术细节
4. 技术的应用场景
5. 学习该技术的前置知识要求`,

      educational: `请分析这个视频的教育价值。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${this.formatDuration(baseInfo.duration)}。请总结：
1. 包含的知识点和学习要点
2. 教学的逻辑性和条理性
3. 适合的学习者水平
4. 可以学到的核心技能或知识
5. 推荐的配套学习资源`,

      entertainment: `请分析这个视频的娱乐价值和内容特色。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，播放量${baseInfo.view}。请分析：
1. 内容的娱乐性和趣味性
2. 创作者的创作风格
3. 受众反响和互动特点
4. 内容的创新点或亮点
5. 在同类内容中的竞争优势`,

      summary: `请为这个视频生成简洁的摘要。视频信息：标题"${baseInfo.title}"，作者"${baseInfo.owner}"，时长${this.formatDuration(baseInfo.duration)}。请提供：
1. 一句话总结视频核心内容
2. 3-5个关键要点
3. 适合推荐给什么类型的观众
4. 观看这个视频能学到什么`
    };

    return prompts[analysisType] || prompts.general;
  }

  /**
   * 格式化时长
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时长
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}