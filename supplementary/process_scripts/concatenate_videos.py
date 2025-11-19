#!/usr/bin/env python3
"""
视频拼接脚本
遍历teaser目录下的所有视频，截取1-48帧，以fps 15拼接，并添加淡入淡出效果
"""

import os
import subprocess
import glob
from pathlib import Path

# 配置参数
TEASER_DIR = "/Users/jiwenbo/Desktop/supplementary/static/videos/teaser"
OUTPUT_DIR = "/Users/jiwenbo/Desktop/supplementary/static/videos"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "teaser_concatenated.mp4")
TEMP_DIR = "/tmp/video_concat_temp"
FRAMES_TO_EXTRACT = 48  # 提取1-48帧
TARGET_FPS = 15
FADE_DURATION = 0.5  # 淡入淡出时长（秒）

def run_command(cmd, description):
    """执行命令并打印输出"""
    print(f"\n执行: {description}")
    print(f"命令: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"错误: {result.stderr}")
        raise Exception(f"命令执行失败: {description}")
    return result.stdout

def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=r_frame_rate,width,height',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"无法获取视频信息: {video_path}")
    
    lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
    fps_str = lines[0] if lines else "30/1"
    width_str = lines[1] if len(lines) > 1 else "1920"
    height_str = lines[2] if len(lines) > 2 else "1080"
    
    # 辅助函数：解析可能是分数的值
    def parse_value(value_str, default):
        try:
            if '/' in value_str:
                num, den = map(int, value_str.split('/'))
                return int(num / den) if den > 0 else default
            else:
                return int(float(value_str))
        except (ValueError, ZeroDivisionError):
            return default
    
    # 计算实际fps，处理不同的格式
    try:
        if '/' in fps_str:
            num, den = map(int, fps_str.split('/'))
            fps = num / den if den > 0 else 30.0
        else:
            # 如果已经是数字格式，直接转换
            fps = float(fps_str)
    except (ValueError, ZeroDivisionError):
        # 如果解析失败，使用默认值
        print(f"警告: 无法解析fps '{fps_str}'，使用默认值30fps")
        fps = 30.0
    
    width = parse_value(width_str, 1920)
    height = parse_value(height_str, 1080)
    
    return fps, width, height

def extract_and_process_video(input_path, output_path, index, total):
    """提取1-48帧，转换为fps 15，统一格式"""
    print(f"\n处理视频 {index+1}/{total}: {os.path.basename(input_path)}")
    
    # 提取第2-49帧（共48帧），然后转换为fps 15
    # 使用select过滤器选择第2-49帧（n从0开始，所以是n>=1且n<=48）
    
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-vf', f'select=between(n\\,1\\,48),setpts=N/FRAME_RATE/TB,fps={TARGET_FPS}',
        '-c:v', 'h264_videotoolbox',
        '-b:v', '2M',
        '-pix_fmt', 'yuv420p',
        '-r', str(TARGET_FPS),  # 确保输出fps为15
        output_path
    ]
    
    run_command(cmd, f"提取并处理视频 {index+1}")
    return output_path

def concatenate_videos(video_list, output_path):
    """拼接所有视频，在每个片段之间添加淡入淡出过渡"""
    print(f"\n拼接 {len(video_list)} 个视频，添加片段间淡入淡出...")
    
    if len(video_list) == 1:
        # 只有一个视频，添加淡入淡出
        clip_duration = FRAMES_TO_EXTRACT / TARGET_FPS
        cmd = [
            'ffmpeg', '-y', '-i', video_list[0],
            '-vf', f'fade=t=in:st=0:d={FADE_DURATION},fade=t=out:st={clip_duration - FADE_DURATION}:d={FADE_DURATION}',
            '-c:v', 'h264_videotoolbox', '-b:v', '2M', '-pix_fmt', 'yuv420p',
            output_path
        ]
        run_command(cmd, "处理单个视频")
        return
    
    # 计算每个视频的时长
    clip_duration = FRAMES_TO_EXTRACT / TARGET_FPS
    
    # 使用多输入，在每个视频上添加淡入淡出，然后拼接
    inputs = []
    for i, video in enumerate(video_list):
        inputs.extend(['-i', video])
    
    # 构建filter：为每个视频片段添加淡入淡出
    filter_parts = []
    for i in range(len(video_list)):
        if i == 0:
            # 第一个视频：不淡入，只在结尾淡出
            filter_parts.append(f"[{i}:v]fade=t=out:st={clip_duration - FADE_DURATION}:d={FADE_DURATION}[v{i}]")
        elif i == len(video_list) - 1:
            # 最后一个视频：开头淡入，不淡出
            filter_parts.append(f"[{i}:v]fade=t=in:st=0:d={FADE_DURATION}[v{i}]")
        else:
            # 中间视频：开头淡入，结尾淡出
            filter_parts.append(f"[{i}:v]fade=t=in:st=0:d={FADE_DURATION},fade=t=out:st={clip_duration - FADE_DURATION}:d={FADE_DURATION}[v{i}]")
    
    # 使用concat filter拼接所有处理后的视频
    concat_inputs = "".join([f"[v{i}]" for i in range(len(video_list))])
    filter_parts.append(f"{concat_inputs}concat=n={len(video_list)}:v=1:a=0[final]")
    
    filter_complex = ";".join(filter_parts)
    
    print(f"\n拼接 {len(video_list)} 个视频片段")
    print(f"每个视频片段时长: {clip_duration}秒")
    print(f"淡入淡出时长: {FADE_DURATION}秒")
    print(f"每个片段在结尾淡出、下一个片段在开头淡入")
    
    cmd = [
        'ffmpeg', '-y'
    ] + inputs + [
        '-filter_complex', filter_complex,
        '-map', '[final]',
        '-c:v', 'h264_videotoolbox',
        '-b:v', '2M',
        '-pix_fmt', 'yuv420p',
        '-r', str(TARGET_FPS),
        output_path
    ]
    
    run_command(cmd, "拼接所有视频")
    print(f"\n输出文件: {output_path}")

def main():
    # 创建临时目录
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    # 获取所有视频文件
    video_files = sorted(glob.glob(os.path.join(TEASER_DIR, "*.mp4")))
    
    if not video_files:
        print(f"在 {TEASER_DIR} 中未找到视频文件")
        return
    
    print(f"找到 {len(video_files)} 个视频文件")
    
    # 处理每个视频
    processed_videos = []
    for i, video_path in enumerate(video_files):
        temp_output = os.path.join(TEMP_DIR, f"processed_{i:03d}.mp4")
        extract_and_process_video(video_path, temp_output, i, len(video_files))
        processed_videos.append(temp_output)
    
    # 拼接所有视频
    concatenate_videos(processed_videos, OUTPUT_FILE)
    
    # 清理临时文件
    print("\n清理临时文件...")
    for temp_file in processed_videos:
        if os.path.exists(temp_file):
            os.remove(temp_file)
    concat_file = os.path.join(TEMP_DIR, "concat_list.txt")
    if os.path.exists(concat_file):
        os.remove(concat_file)
    
    print(f"\n完成！输出文件: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

