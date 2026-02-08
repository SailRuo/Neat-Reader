const express = require('express');
const router = express.Router();
const ttsService = require('../services/ttsService');

/**
 * 获取可用语音列表
 * GET /api/tts/voices
 */
router.get('/voices', async (req, res) => {
    try {
        const voices = await ttsService.getVoices();
        res.json({
            success: true,
            data: voices
        });
    } catch (error) {
        console.error('获取语音列表失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 合成语音
 * POST /api/tts/synthesize
 * Body: { text, voice, rate, pitch, volume }
 */
router.post('/synthesize', async (req, res) => {
    try {
        const { text, voice, rate, pitch, volume } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: '缺少 text 参数'
            });
        }

        const audioData = await ttsService.synthesizeEdge(text, {
            voice,
            rate: rate || 0,
            pitch: pitch || 0,
            volume: volume || 0
        });

        // 返回音频数据
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioData.length,
            'Cache-Control': 'public, max-age=3600'
        });
        res.send(audioData);
    } catch (error) {
        console.error('合成语音失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 流式合成语音
 * POST /api/tts/synthesize-stream
 * Body: { text, voice, rate, pitch, volume }
 */
router.post('/synthesize-stream', async (req, res) => {
    try {
        const { text, voice, rate, pitch, volume } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: '缺少 text 参数'
            });
        }

        res.set({
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache'
        });

        await ttsService.synthesizeStream(
            text,
            { voice, rate: rate || 0, pitch: pitch || 0, volume: volume || 0 },
            (chunk) => {
                res.write(chunk);
            }
        );

        res.end();
    } catch (error) {
        console.error('流式合成失败:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

/**
 * 清理缓存
 * DELETE /api/tts/cache
 */
router.delete('/cache', async (req, res) => {
    try {
        await ttsService.clearCache();
        res.json({
            success: true,
            message: '缓存已清理'
        });
    } catch (error) {
        console.error('清理缓存失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
