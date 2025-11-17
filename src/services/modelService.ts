import axios, { AxiosInstance } from 'axios';
import { ModelConfig, VideoInfo, SummaryResult } from '../types';

export class ModelService {
  private axiosInstance: AxiosInstance;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: 60000, // 60秒超时
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    });
  }

  async generateSummary(videoInfo: VideoInfo): Promise<SummaryResult> {
    try {
      const prompt = this.buildPrompt(videoInfo);
      
      // 这里使用OpenAI兼容的API格式
      const response = await this.axiosInstance.post('/v1/chat/completions', {
        model: this.config.model || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的视频内容分析师，请根据提供的视频信息生成详细的摘要和分析。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

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

  private buildPrompt(videoInfo: VideoInfo): string {
    return `请根据以下B站视频信息生成详细的摘要和分析：

视频标题：${videoInfo.title}
视频链接：${videoInfo.url}
${videoInfo.duration ? `视频时长：${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : ''}

请提供以下内容：
1. 视频整体摘要（200-300字）：概括视频的主要内容和核心观点
2. 分段内容分析：将视频内容分成若干段落，每段提供：
   - 时间戳范围（格式：MM:SS-MM:SS）
   - 该段落的中心思想
   - 关键要点（3-5个）

请确保分析准确、详细，便于用户快速了解视频内容。`;
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
      await this.axiosInstance.post('/v1/chat/completions', {
        model: this.config.model || 'gpt-4-vision-preview',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}