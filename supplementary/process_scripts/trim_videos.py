#!/usr/bin/env python3
"""
视频裁剪脚本
截取视频的第 1-48 帧（跳过第 0 帧）
"""

import os
import subprocess
import glob
from pathlib import Path

# 配置参数
INPUT_DIR = "/Users/jiwenbo/Desktop/supplementary/static/videos/ablation_cfg"
OUTPUT_SUFFIX = "_trimmed"
START_FRAME = 1  # 从第 1 帧开始（跳过第 0 帧）
END_FRAME = 48   # 到第 48 帧结束
TOTAL_FRAMES = 48  # 共 48 帧

def run_command(cmd, description):
    """执行命令并打印输出"""
    print(f"\n执行: {description}")
    print(f"命令: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"错误: {result.stderr}")
        raise Exception(f"命令执行失败: {description}")
    return result.stdout

def get_video_frame_count(video_path):
    """获取视频总帧数"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-count_frames',
        '-show_entries', 'stream=nb_read_frames',
        '-of', 'default=nokey=1:noprint_wrappers=1',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"无法获取视频帧数: {video_path}")
    
    try:
        frame_count = int(result.stdout.strip())
        return frame_count
    except ValueError:
        print(f"警告: 无法解析帧数，尝试备用方法")
        # 备用方法：使用 duration * fps
        cmd = [
            'ffprobe', '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=nb_frames',
            '-of', 'default=nokey=1:noprint_wrappers=1',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.stdout.strip():
            return int(result.stdout.strip())
        else:
            raise Exception(f"无法获取视频帧数: {video_path}")

def trim_video(input_path, output_path):
    """截取视频的第 1-48 帧（跳过第 0 帧）"""
    print(f"\n处理视频: {os.path.basename(input_path)}")
    
    # 获取总帧数
    total_frames = get_video_frame_count(input_path)
    print(f"总帧数: {total_frames}")
    
    # 检查视频是否有足够的帧
    if total_frames < END_FRAME + 1:
        print(f"警告: 视频 {os.path.basename(input_path)} 帧数不足 ({total_frames} 帧)，需要至少 {END_FRAME + 1} 帧，跳过")
        return False
    
    print(f"截取帧 {START_FRAME} 到 {END_FRAME} (共 {TOTAL_FRAMES} 帧)")
    
    # 使用 select 过滤器选择帧
    # 选择帧 1 到 48，即 n >= 1 且 n <= 48
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-vf', f'select=between(n\\,{START_FRAME}\\,{END_FRAME}),setpts=N/FRAME_RATE/TB',
        '-c:v', 'h264_videotoolbox',
        '-b:v', '2M',
        '-pix_fmt', 'yuv420p',
        output_path
    ]
    
    run_command(cmd, f"截取视频")
    print(f"输出文件: {output_path}")
    return True

def main():
    # 递归查找所有 .mp4 文件
    video_files = []
    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith('.mp4') and OUTPUT_SUFFIX not in file:
                video_files.append(os.path.join(root, file))
    
    video_files.sort()
    
    if not video_files:
        print(f"在 {INPUT_DIR} 中未找到视频文件")
        return
    
    print(f"找到 {len(video_files)} 个视频文件")
    
    # 处理每个视频
    success_count = 0
    skip_count = 0
    
    for i, video_path in enumerate(video_files):
        print(f"\n{'='*80}")
        print(f"进度: {i+1}/{len(video_files)}")
        
        # 生成输出文件名
        video_dir = os.path.dirname(video_path)
        video_name = os.path.basename(video_path)
        name_without_ext = os.path.splitext(video_name)[0]
        output_name = f"{name_without_ext}{OUTPUT_SUFFIX}.mp4"
        output_path = os.path.join(video_dir, output_name)
        
        try:
            if trim_video(video_path, output_path):
                success_count += 1
            else:
                skip_count += 1
        except Exception as e:
            print(f"错误: 处理失败 - {e}")
            skip_count += 1
    
    print(f"\n{'='*80}")
    print(f"\n完成！")
    print(f"成功处理: {success_count} 个视频")
    print(f"跳过: {skip_count} 个视频")

if __name__ == "__main__":
    main()

