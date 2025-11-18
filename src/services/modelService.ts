import axios, { AxiosInstance } from 'axios';
import { ModelConfig, VideoInfo, SummaryResult } from '../types';
import { VideoStreamExtractor } from './videoStreamExtractor';

export class ModelService {
  private axiosInstance: AxiosInstance;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    
    // 确保baseURL格式正确 - ModelScope API端点
    let baseURL = config.baseUrl;
    if (!baseURL.endsWith('/')) {
      baseURL += '/';
    }
    
    console.log('创建ModelService实例:', {
      baseURL: baseURL,
      model: config.model,
      hasApiKey: !!config.apiKey
    });
    
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: 60000, // 60秒超时
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    // 添加请求拦截器用于调试
    this.axiosInstance.interceptors.request.use((config) => {
      console.log('API请求:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        data: config.data
      });
      return config;
    });

    // 添加响应拦截器用于调试
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('API响应成功:', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        console.error('API响应错误:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async generateSummary(videoInfo: VideoInfo): Promise<SummaryResult> {
    try {
      // 根据baseURL判断使用哪种API格式
      let endpoint = '/v1/chat/completions';
      let messages: any[] = [];

      // 如果是ModelScope API且是VL模型，尝试使用多模态格式
      if (this.config.baseUrl.includes('modelscope.cn') && this.config.model && this.config.model.includes('VL')) {
        console.log('尝试使用VL模型进行视频分析...');
        
        // 尝试获取视频流URL
        let videoStreamUrl = null;
        if (videoInfo.bvid) {
          videoStreamUrl = await VideoStreamExtractor.getVideoStreamUrl(videoInfo.bvid);
          console.log('视频流URL获取结果:', videoStreamUrl ? '成功' : '失败');
        }
        
        // 尝试获取封面图片
        let coverImageUrl = await VideoStreamExtractor.getVideoCoverImage(videoInfo);
        console.log('封面图片URL:', coverImageUrl);
        
        if (videoStreamUrl) {
          // 如果成功获取到视频流URL，尝试视频分析
          messages = [
            {
              role: 'user',
              content: [
                {
                  type: 'video',
                  video: videoStreamUrl
                },
                {
                  type: 'text',
                  text: this.buildVideoAnalysisPrompt(videoInfo)
                }
              ]
            }
          ];
        } else if (coverImageUrl) {
          // 如果只有封面图片，使用图片+文本分析
          messages = [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  image: coverImageUrl
                },
                {
                  type: 'text',
                  text: this.buildImageAnalysisPrompt(videoInfo)
                }
              ]
            }
          ];
        } else {
          // 如果无法获取媒体内容，退回到文本分析
          console.log('无法获取视频流或封面，使用文本分析模式');
          messages = this.buildTextAnalysisMessages(videoInfo);
        }
      } else {
        // 普通文本模型格式
        messages = this.buildTextAnalysisMessages(videoInfo);
      }

      // 检查模型名称是否正确，如果不存在则使用可用的Qwen3-VL模型
      let modelName = this.config.model || 'Qwen/Qwen3-VL-30B-A3B-Instruct';
      
      // 如果是指定的模型但API返回404，尝试使用可用的替代模型
      if (modelName === 'Qwen/Qwen3-VL-30B-A3B-Instruct') {
        modelName = 'Qwen/Qwen3-VL-8B-Instruct'; // 使用可用的8B模型
      }

      let requestBody: any = {
        model: modelName,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      };

      // 如果是ModelScope API，使用兼容模式
      if (this.config.baseUrl.includes('modelscope.cn')) {
        // ModelScope可能需要额外的参数
        requestBody = {
          ...requestBody,
          enable_thinking: false  // 禁用思考模式以避免兼容性问题
        };
      }
      
      const response = await this.axiosInstance.post(endpoint, requestBody);

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('模型返回内容为空');
      }

      return this.parseSummary(content);
    } catch (error) {
      console.error('生成摘要失败:', error);
      throw new Error(`生成摘要失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private buildTextAnalysisMessages(videoInfo: VideoInfo): any[] {
    const prompt = `请根据以下B站视频信息生成详细的摘要和分析：

视频标题：${videoInfo.title}
视频链接：${videoInfo.url}
${videoInfo.duration ? `视频时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : ''}

请提供以下内容：
1. 视频整体摘要（200-300字）：根据标题和时长等信息，推测视频的主要内容和核心观点
2. 分段内容分析：基于典型视频结构，提供可能的内容分段分析

请确保分析合理、详细，便于用户快速了解视频可能的内容。`;

    return [
      {
        role: 'system',
        content: '你是一个专业的视频内容分析师，请根据提供的视频信息生成详细的摘要和分析。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
  }

  private buildVideoAnalysisPrompt(videoInfo: VideoInfo): string {
    return `请分析这个B站视频的内容，并提供详细的信息：

视频标题：${videoInfo.title}
视频时长：${videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}

请仔细观察视频内容，提供以下信息：
1. 视频整体摘要（200-300字）：详细描述视频的主要内容和核心观点
2. 场景描述：视频中的主要场景、背景、环境等
3. 人物分析：如果出现人物，描述他们的特征、行为、对话等
4. 关键事件：视频中的重要事件或转折点
5. 分段内容分析：将视频内容按时间顺序分成若干段落，每段提供：
   - 时间戳范围（格式：MM:SS-MM:SS）
   - 该段落的中心思想
   - 关键要点（3-5个）

请确保分析准确、详细，便于用户快速了解视频内容。`;
  }

  private buildImageAnalysisPrompt(videoInfo: VideoInfo): string {
    return `请分析这张图片（视频封面），并结合视频信息提供分析：

视频标题：${videoInfo.title}
视频时长：${videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}

请仔细观察图片内容，并结合视频标题和时长信息，提供以下分析：
1. 封面图片内容描述：详细描述图片中的场景、人物、物体等
2. 视频内容推测：基于封面和标题，推测视频可能的主要内容
3. 风格和类型分析：分析视频可能的风格（如教育、娱乐、科技等）
4. 目标受众分析：推测视频的目标观看群体
5. 内容质量评估：基于封面设计质量，评估视频制作水平

请提供合理、详细的分析，帮助用户了解这个视频。`;
  }

  private parseSummary(content: string): SummaryResult {
    try {
      // 简单的解析逻辑，可以根据实际需求调整
      const lines = content.split('\n').filter(line => line.trim());
      let overall = '';
      const segments: any[] = [];
      let currentSegment: any = null;

      for (const line of lines) {
        if (line.includes('整体摘要') || line.includes('主要内容') || line.includes('核心观点')) {
          // 提取整体摘要
          const summaryStart = lines.indexOf(line) + 1;
          for (let i = summaryStart; i < lines.length; i++) {
            if (lines[i].includes('分段') || lines[i].includes('时间戳')) {
              break;
            }
            overall += lines[i] + '\n';
          }
        } else if (line.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/)) {
          // 时间戳行
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            startTime: line.split('-')[0].trim(),
            endTime: line.split('-')[1].trim(),
            content: '',
            keyPoints: []
          };
        } else if (currentSegment) {
          if (line.includes('•') || line.includes('-')) {
            // 关键要点
            currentSegment.keyPoints.push(line.replace(/[•-]/g, '').trim());
          } else {
            // 内容描述
            currentSegment.content += line + '\n';
          }
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }

      return {
        overall: overall.trim() || content.substring(0, 300),
        segments: segments.map(seg => ({
          ...seg,
          content: seg.content.trim()
        })),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('解析摘要失败:', error);
      // 如果解析失败，返回原始内容作为整体摘要
      return {
        overall: content.substring(0, 300),
        segments: [],
        timestamp: Date.now()
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // 检查模型名称是否正确，如果不存在则使用可用的Qwen3-VL模型
      let modelName = this.config.model || 'Qwen/Qwen3-VL-30B-A3B-Instruct';
      
      // 如果是指定的模型但API返回404，尝试使用可用的替代模型
      if (modelName === 'Qwen/Qwen3-VL-30B-A3B-Instruct') {
        modelName = 'Qwen/Qwen3-VL-8B-Instruct'; // 使用可用的8B模型
      }

      let messages: any[];
      
      // 如果是ModelScope API且是VL模型，使用多模态格式进行测试
      if (this.config.baseUrl.includes('modelscope.cn') && this.config.model && this.config.model.includes('VL')) {
        messages = [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Hello'
              }
            ]
          }
        ];
      } else {
        // 普通文本模型格式
        messages = [{ role: 'user', content: 'Hello' }];
      }

      let requestBody: any = {
        model: modelName,
        messages: messages,
        max_tokens: 1
      };

      // 如果是ModelScope API，使用兼容模式
      if (this.config.baseUrl.includes('modelscope.cn')) {
        requestBody = {
          ...requestBody,
          enable_thinking: false  // 禁用思考模式以避免兼容性问题
        };
      }

      await this.axiosInstance.post('/v1/chat/completions', requestBody);
      return true;
    } catch (error) {
      console.error('连接测试失败:', error);
      return false;
    }
  }
}