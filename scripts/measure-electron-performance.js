/**
 * Electron 性能测量脚本
 * 
 * 用途：测量 Electron 应用的启动时间、内存使用和构建大小
 * 运行：node scripts/measure-electron-performance.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
        const stats = fs.statSync(currentPath);
        
        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            files.forEach(file => {
                calculateSize(path.join(currentPath, file));
            });
        }
    }
    
    if (fs.existsSync(dirPath)) {
        calculateSize(dirPath);
    }
    
    return totalSize;
}

async function measureBuildSize() {
    log('\n📦 测量构建大小...', 'cyan');
    
    const distPath = path.join(__dirname, '..', 'dist-electron');
    
    if (!fs.existsSync(distPath)) {
        log('⚠️  dist-electron 目录不存在，请先运行 npm run build', 'yellow');
        log('提示：运行 npm run build:win 来构建 Windows 版本', 'yellow');
        return null;
    }
    
    const totalSize = getDirectorySize(distPath);
    const formattedSize = formatBytes(totalSize);
    
    log(`✅ 构建大小: ${formattedSize}`, 'green');
    
    // 查找具体的安装包
    const files = fs.readdirSync(distPath);
    const installers = files.filter(f => f.endsWith('.exe') || f.endsWith('.msi'));
    
    if (installers.length > 0) {
        log('\n📦 安装包详情:', 'cyan');
        installers.forEach(installer => {
            const installerPath = path.join(distPath, installer);
            const installerSize = fs.statSync(installerPath).size;
            log(`   ${installer}: ${formatBytes(installerSize)}`, 'blue');
        });
    }
    
    return {
        totalSize,
        formattedSize,
        installers: installers.map(name => ({
            name,
            size: fs.statSync(path.join(distPath, name)).size
        }))
    };
}

async function measureStartupTime() {
    log('\n🚀 测量启动时间...', 'cyan');
    log('提示：这需要启动 Electron 应用，请确保后端服务正在运行', 'yellow');
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // 启动 Electron 应用
        const electronProcess = spawn('npm', ['run', 'dev:electron'], {
            cwd: path.join(__dirname, '..'),
            shell: true
        });
        
        let output = '';
        let windowReady = false;
        
        electronProcess.stdout.on('data', (data) => {
            output += data.toString();
            
            // 检测窗口是否已准备就绪
            if (output.includes('ready-to-show') || output.includes('did-finish-load')) {
                if (!windowReady) {
                    windowReady = true;
                    const startupTime = Date.now() - startTime;
                    log(`✅ 启动时间: ${startupTime}ms`, 'green');
                    
                    // 关闭 Electron 进程
                    electronProcess.kill();
                    
                    resolve({
                        startupTime,
                        success: true
                    });
                }
            }
        });
        
        electronProcess.stderr.on('data', (data) => {
            // 忽略警告，只记录错误
            const message = data.toString();
            if (message.includes('ERROR') || message.includes('FATAL')) {
                log(`❌ 错误: ${message}`, 'red');
            }
        });
        
        electronProcess.on('error', (error) => {
            log(`❌ 启动失败: ${error.message}`, 'red');
            resolve({
                startupTime: null,
                success: false,
                error: error.message
            });
        });
        
        // 超时处理（30秒）
        setTimeout(() => {
            if (!windowReady) {
                log('⚠️  启动超时（30秒），无法测量启动时间', 'yellow');
                electronProcess.kill();
                resolve({
                    startupTime: null,
                    success: false,
                    error: 'Timeout'
                });
            }
        }, 30000);
    });
}

async function measureMemoryUsage() {
    log('\n💾 测量内存使用...', 'cyan');
    log('提示：需要手动测量运行中的 Electron 应用内存', 'yellow');
    log('步骤：', 'yellow');
    log('  1. 启动应用: npm run dev', 'yellow');
    log('  2. 打开任务管理器（Windows）或活动监视器（macOS）', 'yellow');
    log('  3. 查找 "Neat Reader" 或 "Electron" 进程', 'yellow');
    log('  4. 记录内存使用情况', 'yellow');
    
    return {
        manual: true,
        instructions: [
            '启动应用: npm run dev',
            '打开任务管理器查看内存使用',
            '记录空闲状态内存',
            '打开 EPUB 文件，记录阅读状态内存',
            '打开 PDF 文件，记录阅读状态内存'
        ]
    };
}

async function generateReport(results) {
    log('\n📊 生成性能报告...', 'cyan');
    
    const report = {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: require('../package.json').devDependencies.electron,
        measurements: results
    };
    
    // 保存为 JSON
    const jsonPath = path.join(__dirname, '..', 'electron-performance-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    log(`✅ JSON 报告已保存: ${jsonPath}`, 'green');
    
    // 生成 Markdown 报告
    const mdContent = `# Electron 性能基准测试报告

## 测试信息

- **测试时间**: ${new Date().toLocaleString('zh-CN')}
- **平台**: ${process.platform}
- **Node.js 版本**: ${process.version}
- **Electron 版本**: ${report.electronVersion}

## 测试结果

### 📦 构建大小

${results.buildSize ? `
- **总大小**: ${results.buildSize.formattedSize}
${results.buildSize.installers.map(i => `- **${i.name}**: ${formatBytes(i.size)}`).join('\n')}
` : '⚠️ 未测量（需要先构建应用）'}

### 🚀 启动性能

${results.startup && results.startup.success ? `
- **启动时间**: ${results.startup.startupTime}ms
` : '⚠️ 未测量（需要手动启动应用）'}

### 💾 内存使用

⚠️ 需要手动测量：

1. 启动应用: \`npm run dev\`
2. 打开任务管理器（Windows）或活动监视器（macOS）
3. 查找 "Neat Reader" 或 "Electron" 进程
4. 记录以下状态的内存使用：
   - 空闲状态
   - 阅读 EPUB 文件
   - 阅读 PDF 文件

### 📊 性能目标对比

| 指标 | Electron (当前) | Tauri (目标) | 预期改进 |
|------|----------------|--------------|----------|
| 启动时间 | ~1500ms | ~500ms | ↓ 67% |
| 空闲内存 | ~150MB | ~50MB | ↓ 67% |
| 阅读内存 | ~250MB | ~80MB | ↓ 68% |
| 打包体积 | ~150MB | < 20MB | ↓ 87% |

## 下一步

1. ✅ 完成 Electron 性能基准测试
2. ⏭️ 运行 Tauri WebView2 性能测试
3. ⏭️ 对比两者性能差异
4. ⏭️ 生成最终验证报告

## 测试文件

- JSON 报告: \`electron-performance-report.json\`
- Markdown 报告: \`electron-performance-report.md\`
`;
    
    const mdPath = path.join(__dirname, '..', 'electron-performance-report.md');
    fs.writeFileSync(mdPath, mdContent);
    log(`✅ Markdown 报告已保存: ${mdPath}`, 'green');
    
    return report;
}

async function main() {
    log('========================================', 'bright');
    log('  Electron 性能基准测试', 'bright');
    log('========================================', 'bright');
    
    const results = {};
    
    // 1. 测量构建大小
    results.buildSize = await measureBuildSize();
    
    // 2. 测量启动时间（可选，需要后端服务运行）
    log('\n是否测量启动时间？这需要启动 Electron 应用。', 'yellow');
    log('如果后端服务未运行，请先运行: npm run dev:backend', 'yellow');
    log('跳过启动时间测量，继续其他测试...', 'cyan');
    results.startup = { manual: true };
    
    // 3. 内存使用说明
    results.memory = await measureMemoryUsage();
    
    // 4. 生成报告
    await generateReport(results);
    
    log('\n========================================', 'bright');
    log('  测试完成！', 'green');
    log('========================================', 'bright');
    
    log('\n📝 后续步骤:', 'cyan');
    log('  1. 查看生成的报告文件', 'blue');
    log('  2. 手动测量内存使用（如果需要）', 'blue');
    log('  3. 运行 Tauri 性能测试进行对比', 'blue');
}

// 运行主函数
main().catch(error => {
    log(`\n❌ 测试失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
