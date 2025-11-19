// 视频关键帧提取服务
export class VideoFrameExtractor {
  private static async extractFrameFromVideo(videoUrl: string, time: number = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      // 设置视频属性
      video.crossOrigin = 'anonymous';
      video.currentTime = time;
      
      video.onloadedmetadata = () => {
        // 设置canvas尺寸
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        // 等待视频加载到指定时间
        video.onseeked = () => {
          try {
            // 绘制当前帧
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 转换为base64图片
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // 清理资源
            video.remove();
            canvas.remove();
            
            resolve(dataUrl);
          } catch (error) {
            reject(new Error(`帧提取失败: ${(error as Error).message}`));
          }
        };
        
        video.onerror = () => {
          reject(new Error('视频加载失败'));
        };
      };
      
      video.src = videoUrl;
    });
  }

  static async extractMultipleFrames(videoUrl: string, frameCount: number = 3): Promise<string[]> {
    const frames: string[] = [];
    
    try {
      // 获取视频时长
      const duration = await this.getVideoDuration(videoUrl);
      const interval = duration / (frameCount + 1);
      
      for (let i = 1; i <= frameCount; i++) {
        const time = interval * i;
        try {
          const frame = await this.extractFrameFromVideo(videoUrl, time);
          frames.push(frame);
          console.log(`成功提取第${i}帧，时间点: ${time.toFixed(1)}秒`);
        } catch (error) {
          console.warn(`第${i}帧提取失败:`, (error as Error).message);
        }
      }
      
      return frames;
    } catch (error) {
      console.error('多帧提取失败:', (error as Error).message);
      return frames;
    }
  }

  private static async getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        video.remove();
        resolve(duration);
      };
      
      video.onerror = () => {
        video.remove();
        reject(new Error('无法获取视频时长'));
      };
      
      video.src = videoUrl;
    });
  }

  // 获取B站视频的FLV格式（如果可用）
  static async getFlvStreamUrl(bvid: string, cid: number): Promise<string | null> {
    try {
      // 尝试获取FLV格式的视频流
      const response = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=0&fourk=1`);
      const data = await response.json();
      
      if (data.code === 0 && data.data && data.data.durl && data.data.durl.length > 0) {
        // FLV格式通常是完整的视频文件
        return data.data.durl[0].url;
      }
      
      return null;
    } catch (error) {
      console.error('获取FLV流失败:', error);
      return null;
    }
  }

  // 智能帧提取策略
  static async smartFrameExtraction(videoInfo: any): Promise<{ frames: string[]; strategy: string }> {
    const strategies = [];
    
    // 策略1: 尝试FLV格式（完整视频文件）
    if (videoInfo.bvid && videoInfo.cid) {
      try {
        const flvUrl = await this.getFlvStreamUrl(videoInfo.bvid, videoInfo.cid);
        if (flvUrl) {
          console.log('找到FLV格式视频流，尝试提取关键帧');
          const frames = await this.extractMultipleFrames(flvUrl, 3);
          if (frames.length > 0) {
            return {
              frames,
              strategy: 'FLV关键帧提取'
            };
          }
        }
      } catch (error) {
        console.warn('FLV帧提取失败:', (error as Error).message);
      }
    }
    
    // 策略2: 使用封面图片作为替代
    if (videoInfo.coverImage) {
      console.log('使用封面图片作为视觉分析素材');
      return {
        frames: [videoInfo.coverImage],
        strategy: '封面图片分析'
      };
    }
    
    // 策略3: 生成视觉占位符
    console.log('生成视觉分析占位符');
    const placeholder = this.generateVisualPlaceholder(videoInfo.title);
    return {
      frames: [placeholder],
      strategy: '智能占位符'
    };
  }

  // 生成基于标题的视觉占位符
  private static generateVisualPlaceholder(title: string): string {
    // 创建简单的SVG占位符
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f0f0f0"/>
      <rect x="20" y="20" width="360" height="260" fill="#ffffff" stroke="#ddd" stroke-width="2"/>
      <text x="200" y="150" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#666">
        ${title.length > 30 ? title.substring(0, 30) + '...' : title}
      </text>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#999">
        视频内容分析
      </text>
    </svg>`;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }
}

// 增强的视频分析服务
export class EnhancedVideoAnalyzer {
  static async analyzeWithFrames(videoInfo: any, modelService: any): Promise<any> {
    try {
      console.log('开始智能帧提取和分析...');
      
      // 获取关键帧
      const frameResult = await VideoFrameExtractor.smartFrameExtraction(videoInfo);
      console.log(`使用策略: ${frameResult.strategy}, 提取到 ${frameResult.frames.length} 帧`);
      
      // 构建多模态分析请求
      const messages = this.buildFrameAnalysisMessages(videoInfo, frameResult.frames);
      
      // 调用模型进行分析
      const response = await modelService.generateSummaryWithFrames(messages);
      
      return {
        ...response,
        analysisStrategy: frameResult.strategy,
        frameCount: frameResult.frames.length
      };
      
    } catch (error) {
      console.error('增强视频分析失败:', error);
      // 降级到纯文本分析
      return await modelService.generateSummary(videoInfo);
    }
  }
  
  private static buildFrameAnalysisMessages(videoInfo: any, frames: string[]): any[] {
    const content: any[] = [];
    
    // 添加关键帧
    frames.forEach((frame, index) => {
      content.push({
        type: 'image_url',
        image_url: {
          url: frame
        }
      });
    });
    
    // 添加分析文本
    content.push({
      type: 'text',
      text: `请基于这些关键帧图片和视频信息，提供详细的视频内容分析：

📹 **视频基本信息**：
- 标题：${videoInfo.title}
- 时长：${videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}
- ${videoInfo.bvid ? `BV号：${videoInfo.bvid}` : ''}

🔍 **多帧分析要求**：
1. 请详细描述每个关键帧的画面内容
2. 分析帧与帧之间的内容关联性和故事发展
3. 基于视觉信息推测视频的整体内容和主题
4. 提供时间线分析和内容结构预测
5. 评估视频的观看价值和目标受众

请确保分析全面、准确，帮助用户快速了解视频内容。`
    });
    
    return [{
      role: 'user',
      content: content
    }];
  }
}