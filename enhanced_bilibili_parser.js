/**
 * 增强版B站视频解析器
 * 优化URL获取和可用性验证
 */

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
        req.end();
    });
}

class EnhancedBilibiliVideoParser {
    constructor() {
        this.baseApiUrl = 'https://api.bilibili.com/x/web-interface/view';
        this.playUrlApi = 'https://api.bilibili.com/x/player/playurl';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        };
    }

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
     * 获取优化的视频播放地址
     */
    async getOptimizedVideoUrls(aid, cid, qn = 80) {
        try {
            // 使用HTML5平台参数，提高兼容性
            const params = new URLSearchParams({
                avid: aid,
                cid: cid,
                qn: qn,
                type: '',
                otype: 'json',
                fourk: 0,           // 禁用4K
                fnver: 0,
                fnval: 4048,        // 启用DASH
                platform: 'html5',  // 使用HTML5平台
                high_quality: 0,    // 禁用高质量
                voice_balance: 1    // 启用音频平衡
            });
            
            console.log(`正在获取优化播放地址，aid: ${aid}, cid: ${cid}, 质量: ${qn}`);
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
                        type: 'video',
                        // 添加备用URL
                        backupUrls: video.backupUrl || []
                    });
                });
                
                // 提取音频流
                data.data.dash.audio.forEach(audio => {
                    audioUrls.push({
                        url: audio.baseUrl,
                        quality: audio.id,
                        bandwidth: audio.bandwidth,
                        type: 'audio',
                        // 添加备用URL
                        backupUrls: audio.backupUrl || []
                    });
                });
                
                return { 
                    video: videoUrls, 
                    audio: audioUrls,
                    format: 'dash'
                };
            }
            
            // 处理FLV格式视频
            if (data.data.durl) {
                return {
                    urls: data.data.durl.map(item => ({
                        url: item.url,
                        size: item.size,
                        length: item.length,
                        type: 'flv',
                        // 添加备用URL
                        backupUrls: item.backup_url || []
                    })),
                    format: 'flv'
                };
            }
            
            throw new Error('无法识别的视频格式');
        } catch (error) {
            console.error('❌ 获取视频地址失败:', error);
            throw error;
        }
    }

    /**
     * 验证URL可用性
     */
    async validateUrl(url, timeout = 5000) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': this.headers['User-Agent'],
                    'Referer': 'https://www.bilibili.com'
                }
            });
            
            return {
                valid: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * 获取最佳可用URL
     */
    async getBestAvailableUrl(urls) {
        if (!urls || urls.length === 0) return null;
        
        // 优先测试主URL
        for (const urlData of urls) {
            const validation = await this.validateUrl(urlData.url);
            if (validation.valid) {
                console.log(`✅ 找到可用URL: ${urlData.url.substring(0, 50)}...`);
                return urlData;
            }
            
            // 测试备用URL
            if (urlData.backupUrls && urlData.backupUrls.length > 0) {
                for (const backupUrl of urlData.backupUrls) {
                    const validation = await this.validateUrl(backupUrl);
                    if (validation.valid) {
                        console.log(`✅ 找到可用备用URL: ${backupUrl.substring(0, 50)}...`);
                        return {
                            ...urlData,
                            url: backupUrl,
                            isBackup: true
                        };
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * 主解析函数 - 增强版
     */
    async parseVideoEnhanced(inputUrl, quality = 80) {
        try {
            console.log('🚀 开始增强解析视频链接:', inputUrl);
            
            // 1. 提取BV号
            const bvid = this.extractBV(inputUrl);
            console.log('📹 提取到BV号:', bvid);
            
            // 2. 获取视频基本信息
            const videoInfo = await this.getVideoInfo(bvid);
            
            // 3. 获取播放地址
            const urls = await this.getOptimizedVideoUrls(videoInfo.aid, videoInfo.pages[0].cid, quality);
            
            // 4. 验证并选择最佳URL
            let bestVideoUrl = null;
            let bestAudioUrl = null;
            
            if (urls.format === 'dash') {
                bestVideoUrl = await this.getBestAvailableUrl(urls.video);
                bestAudioUrl = await this.getBestAvailableUrl(urls.audio);
                
                if (!bestVideoUrl) {
                    throw new Error('无法找到可用的视频流URL');
                }
                
                console.log('✅ DASH格式 - 找到最佳可用URL');
                return {
                    success: true,
                    videoInfo: {
                        title: videoInfo.title,
                        owner: videoInfo.owner,
                        duration: videoInfo.duration,
                        view: videoInfo.view,
                        pages: videoInfo.pages.length
                    },
                    format: 'dash',
                    videoUrl: bestVideoUrl,
                    audioUrl: bestAudioUrl,
                    allVideoUrls: urls.video,
                    allAudioUrls: urls.audio
                };
            } else if (urls.format === 'flv') {
                bestVideoUrl = await this.getBestAvailableUrl(urls.urls);
                
                if (!bestVideoUrl) {
                    throw new Error('无法找到可用的FLV URL');
                }
                
                console.log('✅ FLV格式 - 找到最佳可用URL');
                return {
                    success: true,
                    videoInfo: {
                        title: videoInfo.title,
                        owner: videoInfo.owner,
                        duration: videoInfo.duration,
                        view: videoInfo.view,
                        pages: videoInfo.pages.length
                    },
                    format: 'flv',
                    videoUrl: bestVideoUrl,
                    allUrls: urls.urls
                };
            }
            
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
async function testEnhancedParser() {
    console.log('='.repeat(80));
    console.log('🧪 增强版B站视频解析器测试');
    console.log('='.repeat(80));
    
    const testUrl = 'https://www.bilibili.com/video/BV15FUhBeEUm/?spm_id_from=333.1387.homepage.video_card.click&vd_source=cacd624f81e5de87dc7c83443a26ada9';
    
    try {
        const parser = new EnhancedBilibiliVideoParser();
        
        console.log('\n🔍 测试增强版解析器...');
        const result = await parser.parseVideoEnhanced(testUrl, 80);
        
        if (result.success) {
            console.log('✅ 增强版解析成功');
            console.log(`📹 视频: ${result.videoInfo.title}`);
            console.log(`📊 格式: ${result.format}`);
            
            if (result.format === 'dash' && result.videoUrl) {
                console.log(`🎬 最佳视频流: ${result.videoUrl.quality} (${formatQuality(result.videoUrl.quality)})`);
                console.log(`🎵 最佳音频流: ${result.audioUrl ? '可用' : '无'}`);
                console.log(`🔗 视频URL: ${result.videoUrl.url.substring(0, 100)}...`);
                
                // 验证最终URL
                console.log('\n🔍 验证最终URL可用性...');
                const validation = await parser.validateUrl(result.videoUrl.url);
                console.log(`✅ URL验证结果: ${validation.valid ? '可用' : '不可用'}`);
                
            } else if (result.format === 'flv' && result.videoUrl) {
                console.log(`📁 最佳FLV: ${result.videoUrl.url.substring(0, 100)}...`);
                
                // 验证最终URL
                console.log('\n🔍 验证最终URL可用性...');
                const validation = await parser.validateUrl(result.videoUrl.url);
                console.log(`✅ URL验证结果: ${validation.valid ? '可用' : '不可用'}`);
            }
            
        } else {
            console.log('❌ 增强版解析失败:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 测试完成');
    console.log('='.repeat(80));
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

// 运行测试
if (require.main === module) {
    testEnhancedParser().catch(console.error);
}

module.exports = { EnhancedBilibiliVideoParser: EnhancedBilibiliVideoParser };