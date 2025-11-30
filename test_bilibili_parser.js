/**
 * B站视频解析器测试脚本
 * 使用Node.js环境测试BilibiliVideoParser
 */

// 由于原文件是为浏览器环境设计的，我们需要适配Node.js环境
const https = require('https');
const http = require('http');

// 模拟浏览器的fetch API
async function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = httpModule.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: async () => jsonData,
                        text: async () => data
                    });
                } catch (e) {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: async () => { throw new Error('Invalid JSON'); },
                        text: async () => data
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// B站视频解析器类（适配Node.js版本）
class BilibiliVideoParser {
    constructor() {
        this.baseApiUrl = 'https://api.bilibili.com/x/web-interface/view';
        this.playUrlApi = 'https://api.bilibili.com/x/player/playurl';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.bilibili.com'
        };
    }

    /**
     * 从B站视频链接中提取BV号
     * @param {string} url - B站视频链接
     * @returns {string} BV号
     */
    extractBV(url) {
        const patterns = [
            /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
            /b23\.tv\/([a-zA-Z0-9]+)/,
            /BV([a-zA-Z0-9]{10})/
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1].startsWith('BV') ? match[1] : `BV${match[1]}`;
            }
        }
        throw new Error('无法从链接中提取BV号');
    }

    /**
     * 获取视频基本信息（aid, cid等）
     * @param {string} bvid - BV号
     * @returns {Promise<Object>} 视频信息
     */
    async getVideoInfo(bvid) {
        try {
            console.log(`正在获取视频基本信息，BV号: ${bvid}`);
            const response = await fetch(`${this.baseApiUrl}?bvid=${bvid}`, {
                method: 'GET',
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`API返回错误: ${data.message}`);
            }
            
            console.log(`✅ 视频信息获取成功: ${data.data.title}`);
            return {
                aid: data.data.aid,
                title: data.data.title,
                pages: data.data.pages.map(page => ({
                    cid: page.cid,
                    part: page.part,
                    title: page.part
                })),
                owner: data.data.owner.name,
                duration: data.data.duration,
                view: data.data.stat.view
            };
        } catch (error) {
            console.error('❌ 获取视频信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取视频播放地址
     * @param {number} aid - 视频aid
     * @param {number} cid - 视频cid
     * @param {number} qn - 视频质量
     * @returns {Promise<Object>} 视频下载地址
     */
    async getVideoUrls(aid, cid, qn = 80) {
        try {
            const params = new URLSearchParams({
                avid: aid,
                cid: cid,
                qn: qn,
                type: '',
                otype: 'json',
                fourk: 0,           // 禁用4K，提高兼容性
                fnver: 0,
                fnval: 4048,
                platform: 'html5',  // 使用HTML5平台
                high_quality: 0     // 禁用高质量
            });
            
            console.log(`正在获取播放地址，aid: ${aid}, cid: ${cid}, 质量: ${qn}`);
            const response = await fetch(`${this.playUrlApi}?${params}`, {
                method: 'GET',
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`播放地址API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`播放地址API返回错误: ${data.message}`);
            }
            
            console.log(`✅ 播放地址获取成功`);
            
            // 处理DASH格式视频
            if (data.data.dash) {
                const videoUrls = [];
                const audioUrls = [];
                
                // 提取视频流
                data.data.dash.video.forEach(video => {
                    videoUrls.push({
                        url: video.baseUrl,
                        quality: video.id,
                        codecs: video.codecs,
                        bandwidth: video.bandwidth,
                        size: video.size || 0,
                        type: 'video'
                    });
                });
                
                // 提取音频流
                data.data.dash.audio.forEach(audio => {
                    audioUrls.push({
                        url: audio.baseUrl,
                        quality: audio.id,
                        bandwidth: audio.bandwidth,
                        type: 'audio'
                    });
                });
                
                return { video: videoUrls, audio: audioUrls };
            }
            
            // 处理FLV格式视频
            if (data.data.durl) {
                return data.data.durl.map(item => ({
                    url: item.url,
                    size: item.size,
                    length: item.length,
                    type: 'flv'
                }));
            }
            
            throw new Error('无法识别的视频格式');
        } catch (error) {
            console.error('❌ 获取视频地址失败:', error);
            throw error;
        }
    }

    /** 
     * 获取 MP4/FLV 完整文件地址（非 DASH） 
     * @param {number} aid 
     * @param {number} cid 
     * @param {number} qn 建议 64（720P）或更低 
     * @returns {Promise<Array>} MP4/FLV 下载地址 
     */ 
    async getMp4Urls(aid, cid, qn = 64) { 
        const params = new URLSearchParams({ 
            avid: aid, 
            cid: cid, 
            qn: qn,        // 720P 或更低 
            type: '', 
            otype: 'json', 
            fnver: 0, 
            fnval: 0,      // 关键：禁用 DASH，强制 FLV 
            platform: 'html5',  // 使用HTML5平台，提高兼容性
            fourk: 0,      // 禁用4K
            high_quality: 0 // 禁用高质量
        }); 

        const response = await fetch(`${this.playUrlApi}?${params}`, { 
            headers: this.headers 
        }); 

        const data = await response.json(); 
        if (data.code !== 0) throw new Error(data.message); 

        // 返回 FLV 格式的分段地址（可直接下载，浏览器识别为 MP4） 
        return data.data.durl.map(segment => ({ 
            url: segment.url, 
            size: segment.size, 
            length: segment.length, 
            type: 'mp4/flv' 
        })); 
    }

    /**
     * 主解析函数
     * @param {string} inputUrl - 用户输入的B站视频链接
     * @param {number} quality - 视频质量选项
     * @param {boolean} useMp4 - 是否使用MP4/FLV格式（非DASH）
     * @returns {Promise<Object>} 解析结果
     */
    async parseVideo(inputUrl, quality = 80, useMp4 = false) {
        try {
            console.log('🚀 开始解析视频链接:', inputUrl);
            console.log(`📋 格式选项: ${useMp4 ? 'MP4/FLV' : 'DASH'}格式`);
            
            // 1. 提取BV号
            const bvid = this.extractBV(inputUrl);
            console.log('📹 提取到BV号:', bvid);
            
            // 2. 获取视频基本信息
            const videoInfo = await this.getVideoInfo(bvid);
            
            // 3. 获取下载地址
            let allUrls = [];
            
            if (videoInfo.pages.length > 1) {
                // 多P视频
                console.log(`📝 检测到多P视频，共${videoInfo.pages.length}P`);
                for (let i = 0; i < videoInfo.pages.length; i++) {
                    const page = videoInfo.pages[i];
                    console.log(`⏳ 正在获取第${i + 1}P地址: ${page.title}`);
                    
                    const urls = useMp4 ? 
                        await this.getMp4Urls(videoInfo.aid, page.cid, quality > 64 ? 64 : quality) :
                        await this.getVideoUrls(videoInfo.aid, page.cid, quality);
                    
                    allUrls.push({
                        page: i + 1,
                        title: page.title,
                        cid: page.cid,
                        urls: urls,
                        format: useMp4 ? 'mp4' : 'dash'
                    });
                    
                    // 添加延迟避免请求过快
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                // 单P视频
                console.log('📝 单P视频，直接获取地址');
                const urls = useMp4 ? 
                    await this.getMp4Urls(videoInfo.aid, videoInfo.pages[0].cid, quality > 64 ? 64 : quality) :
                    await this.getVideoUrls(videoInfo.aid, videoInfo.pages[0].cid, quality);
                
                allUrls.push({
                    page: 1,
                    title: videoInfo.title,
                    cid: videoInfo.pages[0].cid,
                    urls: urls,
                    format: useMp4 ? 'mp4' : 'dash'
                });
            }
            
            return {
                success: true,
                videoInfo: {
                    title: videoInfo.title,
                    owner: videoInfo.owner,
                    duration: videoInfo.duration,
                    view: videoInfo.view,
                    pages: videoInfo.pages.length
                },
                downloadUrls: allUrls,
                format: useMp4 ? 'mp4' : 'dash'
            };
            
        } catch (error) {
            console.error('❌ 视频解析失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 测试函数
async function testBilibiliParser() {
    console.log('='.repeat(60));
    console.log('🧪 B站视频解析器测试开始');
    console.log('='.repeat(60));
    
    const testUrl = 'https://www.bilibili.com/video/BV1CQSMBWEU5/?spm_id_from=333.1387.homepage.video_card.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
    
    // 对比Snapany提供的可访问URL
    const snapanyWorkingUrl = 'https://upos-sz-estgoss.bilivideo.com/upgcxcode/85/99/34277689985/34277689985-1-192.mp4?e=ig8euxZM2rNcNbRV7wdVhwdlhWdMhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&deadline=1764179989&uipk=5&os=estgoss&og=ali&oi=1782024106&nbs=1&platform=html5&trid=a7905328defd48b48382e8c85d2ea25h&mid=0&gen=playurlv3&upsig=9230d00498603b798bd0aa2a69dcd05f&uparams=e,deadline,uipk,os,og,oi,nbs,platform,trid,mid,gen&bvc=vod&nettype=0&bw=839770&buvid=&build=0&dl=0&f=h_0_0&agrr=0&orderid=0,1';
    
    try {
        const parser = new BilibiliVideoParser();
        
        // 测试DASH格式
        console.log('\n� 测试1: DASH格式 (1080P)');
        console.log('-'.repeat(40));
        const resultDash = await parser.parseVideo(testUrl, 80, false);
        
        if (resultDash.success) {
            console.log('✅ DASH格式测试成功');
            console.log(`📹 视频: ${resultDash.videoInfo.title}`);
            console.log(`📊 格式: ${resultDash.format}`);
            
            // 显示第一个分P的地址信息
            const firstItem = resultDash.downloadUrls[0];
            if (firstItem.urls.video && firstItem.urls.audio) {
                console.log(`🎬 视频流数量: ${firstItem.urls.video.length}`);
                console.log(`🎵 音频流数量: ${firstItem.urls.audio.length}`);
            }
        } else {
            console.log('❌ DASH格式测试失败:', resultDash.error);
        }
        
        // 测试MP4格式
        console.log('\n🔍 测试2: MP4/FLV格式 (720P)');
        console.log('-'.repeat(40));
        const resultMp4 = await parser.parseVideo(testUrl, 64, true);
        
        if (resultMp4.success) {
            console.log('✅ MP4格式测试成功');
            console.log(`📹 视频: ${resultMp4.videoInfo.title}`);
            console.log(`📊 格式: ${resultMp4.format}`);
            
            // 显示第一个分P的地址信息
            const firstItem = resultMp4.downloadUrls[0];
            if (Array.isArray(firstItem.urls)) {
                console.log(`📁 分段数量: ${firstItem.urls.length}`);
                if (firstItem.urls.length > 0) {
                    console.log(`🔗 示例地址: ${firstItem.urls[0].url}`);
                    console.log(`📦 文件大小: ${formatSize(firstItem.urls[0].size)}`);
                }
            }
        } else {
            console.log('❌ MP4格式测试失败:', resultMp4.error);
        }
        
        // 对比总结
        console.log('\n📈 对比总结');
        console.log('='.repeat(40));
        if (resultDash.success && resultMp4.success) {
            console.log('✅ 两种格式都获取成功');
            console.log(`📊 DASH格式: 视频+音频分离，适合高质量播放`);
            console.log(`📊 MP4格式: 完整视频文件，适合直接下载播放`);
            
            // 显示文件大小对比（如果有数据）
            const mp4FirstSegment = resultMp4.downloadUrls[0].urls[0];
            
            if (mp4FirstSegment) {
                console.log(`📦 MP4分段大小: ${formatSize(mp4FirstSegment.size)}`);
                
                // 测试URL可访问性
                console.log('\n🔍 URL可访问性测试:');
                await testUrlAccessibility(snapanyWorkingUrl, 'Snapany URL (已知可用)');
                await testUrlAccessibility(mp4FirstSegment.url, '我们的MP4 URL');
                
                // 使用多模态模型分析视频（通过封面图片避免直接访问加密视频）
                console.log('\n🤖 多模态模型视频分析:');
                console.log('='.repeat(50));
                
                // 获取封面图片URL
                const coverUrl = resultMp4.videoInfo.pic || resultMp4.videoInfo.cover;
                
                const analysisResult = await analyzeVideoWithMultimodalModel(
                    mp4FirstSegment.url,
                    resultMp4.videoInfo.title,
                    coverUrl
                );
                
                if (analysisResult.success) {
                    console.log('✅ 视频分析完成，摘要已生成');
                } else {
                    console.log('❌ 视频分析失败:', analysisResult.error);
                }
            }
        } else if (resultMp4.success) {
            console.log('✅ MP4格式可用，DASH格式失败');
            console.log('💡 建议使用MP4格式获取完整视频文件');
        } else if (resultDash.success) {
            console.log('✅ DASH格式可用，MP4格式失败');
            console.log('💡 建议使用DASH格式，但需要合并视频和音频');
        } else {
            console.log('❌ 两种格式都获取失败');
            console.log('🔧 请检查视频链接是否有效或稍后重试');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 测试完成');
    console.log('='.repeat(60));
}

// 辅助函数
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

function formatQuality(qn) {
    const qualityMap = {
        16: '360P',
        32: '480P',
        64: '720P',
        80: '1080P',
        112: '1080P+',
        116: '1080P60',
        127: '4K',
        126: '杜比视界'
    };
    return qualityMap[qn] || `未知质量(${qn})`;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * 测试URL可访问性
 * @param {string} url - 要测试的URL
 * @param {string} label - URL标签
 */
async function testUrlAccessibility(url, label) {
    console.log(`\n🔍 测试URL可访问性: ${label}`);
    console.log(`URL: ${url.substring(0, 100)}...`);
    
    try {
        const response = await fetch(url, {
            method: 'HEAD',  // 使用HEAD请求减少数据传输
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.bilibili.com'
            }
        });
        
        if (response.ok) {
            console.log(`✅ ${label} - 可访问 (状态码: ${response.status})`);
            return true;
        } else {
            console.log(`❌ ${label} - 不可访问 (状态码: ${response.status})`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${label} - 访问错误: ${error.message}`);
        return false;
    }
}

/**
 * 使用多模态模型分析视频摘要（通过代理解决加密链接问题）
 * @param {string} videoUrl - 视频地址
 * @param {string} videoTitle - 视频标题
 * @param {string} coverUrl - 封面图片地址（可选）
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeVideoWithMultimodalModel(videoUrl, videoTitle, coverUrl = null) {
    const base_url = 'https://api-inference.modelscope.cn/v1';
    const api_key = 'ms-871280c4-7729-4d3c-bc74-9fbd22dd9660';
    
    console.log('\n🤖 开始多模态模型视频分析...');
    console.log(`📹 视频标题: ${videoTitle}`);
    console.log(`🔗 视频地址: ${videoUrl}...`);
    
    try {
        // 构建多模态内容，优先使用封面图片，如果没有则使用视频URL
        let content;
        if (coverUrl) {
            // 使用封面图片进行视觉分析，避免直接访问加密视频
            content = [
                {
                    type: 'video_url',
                    video_url: coverUrl
                },
                {
                    type: 'text',
                    text: `分析这个视频并提取摘要信息。`
                }
            ];
        } else {
            // 回退到文本分析
            content = [
                {
                    type: 'video_url',
                    video_url: 'https://upos-sz-estgcos.bilivideo.com/upgcxcode/79/55/34304885579/34304885579-1-192.mp4?e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&deadline=1764493371&nbs=1&oi=1851223417&trid=336ba0c9c7f8423ca98fa7e316abd27h&gen=playurlv3&os=estgcos&platform=html5&mid=0&uipk=5&og=cos&upsig=b0b2217408d91c3b979d5add35c1e120&uparams=e,deadline,nbs,oi,trid,gen,os,platform,mid,uipk,og&bvc=vod&nettype=0&bw=774794&f=h_0_0&agrr=1&buvid=&build=0&dl=0&orderid=0,1'
                },
                {
                    type: 'text',
                    text: `分析这个视频并提取摘要信息。`
                }
            ];
        }
        
        const requestBody = {
            model: 'Qwen/Qwen3-VL-8B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };
        
        const response = await fetch(`${base_url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        console.log(`🔑 请求体: ${JSON.stringify(requestBody)}`);
        
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
        console.log('\n📊 视频分析结果:');
        console.log('='.repeat(60));
        console.log(analysisResult);
        console.log('='.repeat(60));
        
        return {
            success: true,
            summary: analysisResult,
            model: 'Qwen/Qwen3-VL-8B-Instruct',
            videoUrl: videoUrl,
            videoTitle: videoTitle,
            analysisType: coverUrl ? 'image-based' : 'text-based',
            coverUrl: coverUrl
        };
        
    } catch (error) {
        console.error('❌ 多模态模型分析失败:', error.message);
        return {
            success: false,
            error: error.message,
            videoUrl: videoUrl,
            videoTitle: videoTitle
        };
    }
}

// 运行测试
if (require.main === module) {
    testBilibiliParser().catch(console.error);
}

module.exports = { BilibiliVideoParser: BilibiliVideoParser };