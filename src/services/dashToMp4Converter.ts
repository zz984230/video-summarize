// DASH到MP4转换服务
export class DashToMp4Converter {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB分片
  
  /**
   * 获取DASH视频的所有片段URL
   */
  static async getDashSegmentUrls(videoUrl: string, bvid: string, cid: number): Promise<{
    initSegment: string;
    videoSegments: string[];
    audioSegments: string[];
    quality: string;
  } | null> {
    try {
      // 获取DASH信息
      const dashInfo = await this.getDashManifest(bvid, cid);
      if (!dashInfo) return null;
      
      // 构建片段URL列表（只获取前几个片段用于分析）
      const videoSegments = dashInfo.videoSegments.slice(0, 5); // 前5个片段，约30秒
      const audioSegments = dashInfo.audioSegments.slice(0, 5);
      
      return {
        initSegment: dashInfo.initSegment,
        videoSegments,
        audioSegments,
        quality: dashInfo.quality
      };
    } catch (error) {
      console.error('获取DASH片段失败:', error);
      return null;
    }
  }
  
  /**
   * 获取DASH manifest信息
   */
  private static async getDashManifest(bvid: string, cid: number): Promise<{
    initSegment: string;
    videoSegments: string[];
    audioSegments: string[];
    quality: string;
  } | null> {
    try {
      const response = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=4048&fourk=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://www.bilibili.com/video/${bvid}`,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        }
      });
      const data = await response.json();
      
      if (data.code !== 0 || !data.data?.dash) {
        return null;
      }
      
      const dash = data.data.dash;
      
      // 获取最高质量的视频流
      const videoStream = dash.video.sort((a: any, b: any) => b.id - a.id)[0];
      const audioStream = dash.audio.sort((a: any, b: any) => b.id - a.id)[0];
      
      // 构建片段URL（基于B站DASH格式）
      const baseVideoUrl = videoStream.baseUrl;
      const baseAudioUrl = audioStream.baseUrl;
      
      // 生成前几个片段的URL
      const videoSegments = [];
      const audioSegments = [];
      
      for (let i = 1; i <= 5; i++) {
        // 使用更标准的片段URL构建方式
        const videoSegmentUrl = baseVideoUrl.replace(/-\d+-\d+\.m4s$/, `-${i}-30032.m4s`);
        const audioSegmentUrl = baseAudioUrl.replace(/-\d+-\d+\.m4s$/, `-${i}-30280.m4s`);
        
        videoSegments.push(videoSegmentUrl);
        audioSegments.push(audioSegmentUrl);
      }
      
      return {
        initSegment: baseVideoUrl, // 使用baseUrl作为初始化片段
        videoSegments,
        audioSegments,
        quality: this.getQualityText(videoStream.id)
      };
    } catch (error) {
      console.error('获取DASH manifest失败:', error);
      return null;
    }
  }
  
  /**
   * 下载并合并DASH片段为MP4（优化版本）
   */
  static async convertDashToMp4(segmentInfo: {
    initSegment: string;
    videoSegments: string[];
    audioSegments: string[];
  }): Promise<{
    videoBlob: Blob;
    audioBlob: Blob;
    duration: number;
  } | null> {
    try {
      console.log('🎬 开始优化版DASH转换...');
      
      // 并行下载初始化片段和视频/音频片段
      const initData = await this.downloadSegment(segmentInfo.initSegment);
      const videoData = await this.downloadSegmentsOptimized(segmentInfo.videoSegments, 'video');
      const audioData = await this.downloadSegmentsOptimized(segmentInfo.audioSegments, 'audio');
      
      if (!initData || videoData.length === 0 || audioData.length === 0) {
        throw new Error('片段下载失败');
      }
      
      console.log('🔧 合并片段为MP4格式...');
      
      // 合并视频数据
      const videoBlob = this.combineSegmentsOptimized(initData, videoData, 'video/mp4');
      const audioBlob = this.combineSegmentsOptimized(initData, audioData, 'audio/mp4');
      
      // 更准确的时长估算（基于实际片段数和质量）
      const duration = this.calculateDuration(segmentInfo.videoSegments.length, videoData.length);
      
      console.log(`✅ 转换完成：视频 ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB, 音频 ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB, 时长 ${duration}秒`);
      
      return {
        videoBlob,
        audioBlob,
        duration
      };
      
    } catch (error) {
      console.error('❌ DASH转换失败:', error);
      return null;
    }
  }
  
  /**
   * 下载单个片段（带重试机制）
   */
  private static async downloadSegment(url: string, maxRetries = 3): Promise<ArrayBuffer | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 下载片段 (尝试 ${attempt}/${maxRetries}): ${url.substring(0, 50)}...`);
        
        // 解析URL获取参数
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        // 构建完整的请求头，包含所有必要的参数
        const response = await fetch(url, {
          headers: {
            'Referer': 'https://www.bilibili.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            // 添加B站特定的头信息
            'Origin': 'https://www.bilibili.com',
            'Range': 'bytes=0-', // 请求从开头下载
            'TE': 'trailers'
          },
          // 添加超时机制
          signal: AbortSignal.timeout(30000), // 30秒超时
          // 确保以匿名模式发送请求，避免cookie问题
          credentials: 'omit',
          mode: 'cors'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.arrayBuffer();
        console.log(`✅ 片段下载成功: ${(data.byteLength / 1024).toFixed(1)}KB`);
        return data;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ 下载片段失败 (尝试 ${attempt}/${maxRetries}):`, errorMessage);
        
        if (attempt === maxRetries) {
          console.error(`❌ 片段下载最终失败: ${url}`);
          return null;
        }
        
        // 指数退避重试
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    
    return null;
  }
  
  /**
   * 优化的多片段下载（并行下载）
   */
  private static async downloadSegmentsOptimized(urls: string[], type: string): Promise<ArrayBuffer[]> {
    console.log(`🔄 开始并行下载${type}片段 (${urls.length}个)...`);
    
    // 限制并发数，避免过多请求
    const concurrencyLimit = 3;
    const results: ArrayBuffer[] = [];
    
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      console.log(`📦 下载批次 ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(urls.length / concurrencyLimit)}`);
      
      const batchPromises = batch.map(url => this.downloadSegment(url));
      const batchResults = await Promise.all(batchPromises);
      
      // 过滤掉失败的下载
      const successfulResults = batchResults.filter(data => data !== null) as ArrayBuffer[];
      results.push(...successfulResults);
      
      if (successfulResults.length < batch.length) {
        console.warn(`⚠️ 批次下载部分失败: ${successfulResults.length}/${batch.length} 成功`);
      }
      
      // 批次间短暂延迟
      if (i + concurrencyLimit < urls.length) {
        await this.delay(500);
      }
    }
    
    console.log(`✅ ${type}片段下载完成: ${results.length}/${urls.length} 成功`);
    return results;
  }
  
  /**
   * 优化的片段合并（减少内存复制）
   */
  private static combineSegmentsOptimized(initData: ArrayBuffer, segmentData: ArrayBuffer[], mimeType: string): Blob {
    console.log('🔧 开始优化片段合并...');
    
    // 计算总大小
    let totalSize = initData.byteLength;
    for (const segment of segmentData) {
      totalSize += segment.byteLength;
    }
    
    console.log(`📊 总数据大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    // 创建合并后的ArrayBuffer
    const combined = new ArrayBuffer(totalSize);
    const view = new Uint8Array(combined);
    
    // 复制初始化数据
    let offset = 0;
    view.set(new Uint8Array(initData), offset);
    offset += initData.byteLength;
    
    console.log(`📥 初始化数据: ${(initData.byteLength / 1024).toFixed(1)}KB`);
    
    // 复制所有片段数据
    for (let i = 0; i < segmentData.length; i++) {
      const segment = segmentData[i];
      view.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
      
      if ((i + 1) % 10 === 0 || i === segmentData.length - 1) {
        console.log(`📄 合并进度: ${i + 1}/${segmentData.length} (${((offset / totalSize) * 100).toFixed(1)}%)`);
      }
    }
    
    console.log('✅ 片段合并完成');
    return new Blob([combined], { type: mimeType });
  }
  
  /**
   * 计算视频时长
   */
  private static calculateDuration(segmentCount: number, successfulSegments: number): number {
    // B站DASH片段通常每个6秒，但根据成功下载的片段数调整
    const baseDuration = 6; // 每个片段约6秒
    const estimatedDuration = Math.min(segmentCount, successfulSegments) * baseDuration;
    
    console.log(`⏱️ 估算视频时长: ${estimatedDuration}秒 (${successfulSegments}/${segmentCount} 片段)`);
    return estimatedDuration;
  }
  
  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 创建可访问的MP4 URL
   */
  static createMp4Url(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
  
  /**
   * 清理URL对象
   */
  static revokeMp4Url(url: string): void {
    URL.revokeObjectURL(url);
  }
  
  /**
   * 获取画质文本
   */
  private static getQualityText(quality: number): string {
    const qualityMap: { [key: number]: string } = {
      120: '4K超清',
      116: '1080P60帧',
      112: '1080P+',
      80: '1080P',
      74: '720P60帧',
      64: '720P',
      32: '480P',
      16: '360P'
    };
    return qualityMap[quality] || `${quality}P`;
  }
}

/**
 * 增强的视频分析服务 - 支持DASH转MP4
 */
export class EnhancedVideoAnalyzerPro {
  /**
   * 使用DASH视频流进行VL模型分析
   */
  static async analyzeWithDashStream(videoInfo: any, modelService: any): Promise<any> {
    try {
      console.log('🎬 开始DASH视频流分析...');
      
      // 补全 bvid
      if (!videoInfo.bvid && videoInfo.url) {
        const match = String(videoInfo.url).match(/\/video\/(BV[\w]+)/);
        if (match) {
          videoInfo.bvid = match[1];
        }
      }

      // 补全 cid（优先使用API获取pages对应cid）
      if (!videoInfo.cid && videoInfo.bvid) {
        const resolvedCid = await this.getCidFromApi(videoInfo.bvid, videoInfo.url);
        if (resolvedCid) {
          videoInfo.cid = resolvedCid;
          console.log(`✅ 自动补全CID成功: ${resolvedCid}`);
        }
      }

      // 若仍缺失，走备用分析而非中断
      if (!videoInfo.bvid || !videoInfo.cid) {
        console.warn('⚠️ 无法补全BV或CID，使用备用分析方案');
        return await this.analyzeWithFallback(videoInfo, modelService);
      }
      
      // 1. 获取DASH片段信息
      const dashInfo = await DashToMp4Converter.getDashSegmentUrls(
        videoInfo.url, 
        videoInfo.bvid, 
        parseInt(String(videoInfo.cid), 10)
      );
      
      if (!dashInfo) {
        console.log('无法获取DASH信息，使用备用方案');
        return await this.analyzeWithFallback(videoInfo, modelService);
      }
      
      console.log(`📊 获取DASH信息成功: ${dashInfo.quality}, ${dashInfo.videoSegments.length}个片段`);
      
      // 2. 转换为MP4格式
      const mp4Data = await DashToMp4Converter.convertDashToMp4(dashInfo);
      if (!mp4Data) {
        console.log('🔄 DASH转换失败，尝试获取完整视频流URL...');
        
        try {
          const { VideoStreamExtractor } = await import('./videoStreamExtractor');
          const streamUrl = await VideoStreamExtractor.getVideoStreamUrl(videoInfo.bvid);
          
          if (streamUrl) {
            console.log('✅ 成功获取完整视频流URL，尝试直接分析...');
            
            // 使用完整视频流URL直接分析
            const messages = [{
              role: 'user',
              content: [
                {
                  type: 'video',
                  video: streamUrl
                },
                {
                  type: 'text',
                  text: this.buildVideoAnalysisPrompt(videoInfo, streamUrl)
                }
              ]
            }];
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('VL模型分析超时')), 120000)
            );
            
            const analysisPromise = modelService.generateSummaryWithFrames(messages);
            const retryTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('VL模型分析超时')), 120000)
            );
            const result = await Promise.race([analysisPromise, retryTimeoutPromise]);
            
            return {
              ...result,
              analysisStrategy: '完整视频流URL分析',
              videoUrl: streamUrl,
              fallbackReason: 'DASH片段下载失败'
            };
          } else {
            console.log('⚠️ 无法获取完整视频流URL，降级到封面图片分析');
            return await this.analyzeWithCoverImageFallback(videoInfo, modelService);
          }
        } catch (streamError) {
           console.log('⚠️ 获取完整视频流URL失败，降级到封面图片分析:', streamError instanceof Error ? streamError.message : String(streamError));
           return await this.analyzeWithCoverImageFallback(videoInfo, modelService);
         }
      }
      
      console.log(`✅ DASH转换成功: 视频${(mp4Data.videoBlob.size / 1024 / 1024).toFixed(1)}MB, ${mp4Data.duration}秒`);
      
      // 3. 创建可访问的URL
      const videoUrl = DashToMp4Converter.createMp4Url(mp4Data.videoBlob);
      
      try {
        // 4. 使用VL模型分析转换后的视频
        const result = await this.analyzeVideoWithVLModel(videoInfo, videoUrl, modelService);
        
        // 5. 清理URL对象
        DashToMp4Converter.revokeMp4Url(videoUrl);
        
        return {
          ...result,
          analysisStrategy: 'DASH视频流分析',
          videoDuration: mp4Data.duration,
          videoSize: mp4Data.videoBlob.size,
          conversionSuccess: true
        };
        
      } catch (vlError) {
        // 清理URL对象
        DashToMp4Converter.revokeMp4Url(videoUrl);
        throw vlError;
      }
      
    } catch (error) {
      console.error('DASH视频流分析失败:', error);
      return await this.analyzeWithFallback(videoInfo, modelService);
    }
  }

  /**
   * 通过B站API解析CID（支持多分P）
   */
  private static async getCidFromApi(bvid: string, url?: string): Promise<string | undefined> {
    try {
      const api = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const resp = await fetch(api, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://www.bilibili.com/video/${bvid}`,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        }
      });
      if (!resp.ok) return undefined;
      const json = await resp.json();
      if (json.code !== 0 || !json.data) return undefined;
      const data = json.data;
      const p = (() => {
        try {
          if (!url) return 1;
          const u = new URL(url);
          const pv = u.searchParams.get('p');
          return pv ? parseInt(pv, 10) || 1 : 1;
        } catch {
          return 1;
        }
      })();
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        const idx = Math.max(0, Math.min(data.pages.length - 1, p - 1));
        const cid = data.pages[idx]?.cid;
        if (cid) return String(cid);
      }
      if (data.cid) return String(data.cid);
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  /**
   * 使用VL模型分析视频（增强版）
   */
  private static async analyzeVideoWithVLModel(videoInfo: any, videoUrl: string, modelService: any): Promise<any> {
    try {
      console.log('🤖 开始VL模型视频分析...');
      
      // 构建多模态消息
      const messages = [{
        role: 'user',
        content: [
          {
            type: 'video',
            video: videoUrl
          },
          {
            type: 'text',
            text: this.buildVideoAnalysisPrompt(videoInfo, videoUrl)
          }
        ]
      }];
      
      // 调用VL模型，带超时保护
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('VL模型分析超时')), 120000) // 2分钟超时
      );
      
      const analysisPromise = modelService.generateSummaryWithFrames(messages);
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      
      console.log('✅ VL模型分析成功完成');
      return result;
      
    } catch (vlError) {
      const errorMessage = vlError instanceof Error ? vlError.message : String(vlError);
      console.error('❌ VL模型分析失败:', errorMessage);
      
      // 如果是视频格式问题，尝试使用完整视频流URL
      if (errorMessage?.includes('video') || errorMessage?.includes('format') || 
          errorMessage?.includes('timeout') || errorMessage?.includes('timeout')) {
        console.log('🔄 尝试使用完整视频流URL进行分析...');
        
        try {
          // 尝试获取完整的视频流URL
          const { VideoStreamExtractor } = await import('./videoStreamExtractor');
          const streamUrl = await VideoStreamExtractor.getVideoStreamUrl(videoInfo.bvid);
          
          if (streamUrl) {
            console.log('✅ 成功获取完整视频流URL，重新尝试分析...');
            
            // 使用完整视频流URL重新尝试分析
            const messages = [{
              role: 'user',
              content: [
                {
                  type: 'video',
                  video: streamUrl
                },
                {
                  type: 'text',
                  text: this.buildVideoAnalysisPrompt(videoInfo, streamUrl)
                }
              ]
            }];
            
            const analysisPromise = modelService.generateSummaryWithFrames(messages);
            const retryTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('VL模型分析超时')), 120000)
            );
            const result = await Promise.race([analysisPromise, retryTimeoutPromise]);
            
            return {
              ...result,
              analysisStrategy: '完整视频流URL分析',
              videoUrl: streamUrl
            };
          } else {
            console.log('⚠️ 无法获取完整视频流URL，降级到封面图片分析');
            return await this.analyzeWithCoverImageFallback(videoInfo, modelService);
          }
        } catch (streamError) {
           console.log('⚠️ 获取完整视频流URL失败，降级到封面图片分析:', streamError instanceof Error ? streamError.message : String(streamError));
           return await this.analyzeWithCoverImageFallback(videoInfo, modelService);
         }
      }
      
      throw vlError;
    }
  }
  
  /**
   * 封面图片降级分析
   */
  private static async analyzeWithCoverImageFallback(videoInfo: any, modelService: any): Promise<any> {
    try {
      console.log('🖼️ 使用封面图片进行降级分析...');
      
      if (!videoInfo.coverImage) {
        throw new Error('没有可用的封面图片');
      }
      
      // 使用封面图片+增强文本分析
      const messages = [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: videoInfo.coverImage
            }
          },
          {
            type: 'text',
            text: this.buildEnhancedImageAnalysisPrompt(videoInfo)
          }
        ]
      }];
      
      const result = await modelService.generateSummaryWithFrames(messages);
      
      return {
        ...result,
        analysisStrategy: 'DASH视频流转换分析 (封面降级)',
        fallbackReason: 'VL模型无法处理转换后的视频，降级到封面图片分析'
      };
      
    } catch (fallbackError) {
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error('❌ 封面降级分析也失败:', errorMessage);
      throw new Error(`VL模型分析和封面降级分析均失败: ${errorMessage}`);
    }
  }
  
  /**
   * 构建增强的封面图片分析提示词
   */
  private static buildEnhancedImageAnalysisPrompt(videoInfo: any): string {
    return `请详细分析这张视频封面图片，并结合视频信息进行深度分析：

📹 **视频基本信息**：
- 标题：${videoInfo.title}
- 原始链接：${videoInfo.url}
- 时长：${videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}
- BV号：${videoInfo.bvid || '未知'}
- 来源：DASH视频流转换分析（封面降级）

🖼️ **封面图片深度分析要求**：

1. **视觉内容详细描述**（150-200字）
   - 精确描述封面中的所有视觉元素
   - 分析色彩运用、构图设计和视觉层次
   - 识别图片风格（写实、动漫、抽象等）
   - 评估图片质量和专业制作水准

2. **视频内容智能推测**（200-250字）
   - 基于封面视觉元素，深度推测视频核心主题
   - 分析可能的故事情节、论述逻辑或内容结构
   - 预测视频的高潮部分、关键信息点
   - 判断视频类型（vlog、教学、娱乐、科普等）

3. **创作者意图分析**（100-150字）
   - 分析封面设计传达的创作目的
   - 推测目标观众群体和观看场景
   - 评估内容的社交传播潜力和话题性

4. **质量与价值评估**（100-150字）
   - 基于封面专业度评估整体制作水准
   - 预测内容的观看价值、信息密度
   - 分析在同类内容中的竞争力和独特性

⚠️ **重要说明**：
由于技术限制，VL模型无法直接分析视频内容，此分析基于封面图片和视频元数据进行智能推测。请尽可能提供准确、详细、有洞察力的分析，帮助用户了解视频内容。

请确保分析专业、客观、全面，让用户通过封面就能对视频内容做出准确判断。`;
  }
  
  /**
   * 备用分析方案
   */
  private static async analyzeWithFallback(videoInfo: any, modelService: any): Promise<any> {
    console.log('使用备用分析方案...');
    return await modelService.generateStandardSummary(videoInfo);
  }
  
  /**
   * 构建视频分析提示词
   */
  private static buildVideoAnalysisPrompt(videoInfo: any, videoUrl: string): string {
    return `请详细分析这个MP4视频的内容，视频来源于B站DASH流转换：

📹 **视频基本信息**：
- 标题：${videoInfo.title}
- 原始链接：${videoInfo.url}
- 时长：${videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}
- BV号：${videoInfo.bvid || '未知'}

🎬 **视频内容分析要求**：

1. **整体内容摘要**（200-300字）
   请详细描述视频的主要情节、场景、人物关系
   分析视频的核心主题和表达意图
   总结视频的高潮部分和关键转折点

2. **分段内容分析**
   将视频按时间顺序分成若干段落，每段提供：
   - 时间戳范围（格式：MM:SS-MM:SS）
   - 该段落的中心内容
   - 关键场景和对话（如适用）
   - 重要的人物动作或表情

3. **视觉元素分析**
   - 描述视频的画面风格和质量
   - 分析色彩运用和视觉效果
   - 评价摄影/动画制作水准
   - 识别标志性的视觉符号

4. **音频内容分析**（如适用）
   - 描述背景音乐的风格和作用
   - 分析人声对话或旁白内容
   - 评价音效运用的效果

5. **内容价值评估**
   - 评估视频的娱乐性、教育性或信息价值
   - 分析适合的目标观众群体
   - 预测观众的观看体验和反馈

请确保分析准确、详细、有深度，帮助用户全面了解这个视频的内容和价值。`;
  }
}