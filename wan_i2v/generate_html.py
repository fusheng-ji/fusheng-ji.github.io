#!/usr/bin/env python3
import json
import os

# 读取JSON文件
with open('animation_prompts_qwen2vl.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 读取failure case列表
failure_cases = set()
try:
    with open('failure_case.txt', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                failure_cases.add(line)
except FileNotFoundError:
    print("警告: failure_case.txt 文件不存在")
    
print(f"加载了 {len(failure_cases)} 个 failure cases")

# 生成HTML
html_content = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wan I2V 视频展示</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1800px;
            margin: 0 auto;
        }

        h1 {
            text-align: center;
            color: #333;
            font-size: 2.5em;
            margin-bottom: 40px;
        }

        .video-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 40px;
        }

        .video-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .video-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .video-labels {
            display: flex;
            margin-bottom: 8px;
        }

        .video-label {
            flex: 1;
            font-size: 0.9em;
            font-weight: bold;
            color: #555;
            text-align: center;
        }

        .video-wrapper {
            position: relative;
            width: 100%;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
        }

        .video-wrapper video {
            width: 100%;
            height: auto;
            display: block;
        }

        .video-info {
            padding: 20px;
        }

        .video-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            word-break: break-word;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .failure-badge {
            background: #ff4444;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .prompt-label {
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
            font-size: 0.95em;
        }

        .video-prompt {
            color: #666;
            line-height: 1.6;
            font-size: 0.95em;
            margin-bottom: 10px;
        }

        .video-negative {
            color: #999;
            font-size: 0.85em;
            line-height: 1.4;
            border-top: 1px solid #eee;
            padding-top: 10px;
            margin-top: 10px;
        }

        .negative-label {
            font-weight: bold;
            color: #777;
            margin-bottom: 5px;
        }

        .error {
            color: red;
            padding: 10px;
            background: #ffe6e6;
            border-radius: 5px;
            margin-top: 10px;
            display: none;
        }

        @media (max-width: 768px) {
            .video-grid {
                grid-template-columns: 1fr;
            }

            h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Wan I2V 视频展示</h1>
        <div id="videoGrid" class="video-grid">
'''

# 将视频分为两组：failure cases 和正常视频
failure_videos = []
normal_videos = []

for name, info in data.items():
    if name in failure_cases:
        failure_videos.append((name, info))
    else:
        normal_videos.append((name, info))

# 先生成failure case视频，再生成正常视频
all_videos = failure_videos + normal_videos

# 为每个视频生成HTML卡片
for name, info in all_videos:
    prompt = info.get('prompt', '暂无描述').replace("'", "\\'")
    negative_prompt = info.get('negative_prompt', '无').replace("'", "\\'")
    
    # 检查是否是failure case
    failure_badge = '<span class="failure-badge">Failure Case</span>' if name in failure_cases else ''
    
    html_content += f'''
            <div class="video-card">
                <div class="video-labels">
                    <div class="video-label">Input Image</div>
                    <div class="video-label">Generated Video</div>
                </div>
                <div class="video-wrapper">
                    <video controls preload="metadata" playsinline webkit-playsinline>
                        <source src="{name}.mp4" type="video/mp4">
                        您的浏览器不支持视频播放。
                    </video>
                </div>
                <div class="video-info">
                    <div class="video-title">
                        <span>{name}</span>
                        {failure_badge}
                    </div>
                    <div class="prompt-label">Prompt:</div>
                    <div class="video-prompt">{prompt}</div>
                    <div class="video-negative">
                        <div class="negative-label">Negative Prompt:</div>
                        <div>{negative_prompt}</div>
                    </div>
                    <div class="error" id="error_{name}"></div>
                </div>
            </div>
'''

html_content += '''
        </div>
    </div>

    <script>
        // 错误处理
        document.addEventListener('DOMContentLoaded', function() {
            const videos = document.querySelectorAll('video');
            videos.forEach(function(video) {
                video.addEventListener('error', function(e) {
                    const card = this.closest('.video-card');
                    const errorDiv = card.querySelector('.error');
                    if (errorDiv) {
                        errorDiv.style.display = 'block';
                        const error = this.error;
                        if (error) {
                            errorDiv.textContent = `视频加载失败 (错误代码: ${error.code})`;
                        } else {
                            errorDiv.textContent = '无法加载视频';
                        }
                    }
                });
            });
        });
    </script>
</body>
</html>
'''

# 写入HTML文件
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"✅ 成功生成 index.html，包含 {len(data)} 个视频")
