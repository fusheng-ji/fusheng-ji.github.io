#!/usr/bin/env python3
"""
视频压缩脚本
递归压缩指定目录下的所有视频文件
"""

import os
import subprocess
import glob
from pathlib import Path

# 配置参数
VIDEO_DIR = "/Users/jiwenbo/Desktop/supplementary/static/videos"
OUTPUT_SUFFIX = "_compressed"  # 输出文件后缀，如果设为空字符串则覆盖原文件
BITRATE = "2M"  # 目标比特率，可以根据需要调整（如 "1M", "1.5M", "2M"）
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv']  # 支持的视频格式

def run_command(cmd, description):
    """执行命令并打印输出"""
    print(f"\n{description}...")
    print(f"命令: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"错误: {e}")
        if e.stderr:
            print(f"错误信息: {e.stderr}")
        return False

def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        lines = result.stdout.strip().split('\n')
        width = int(lines[0]) if lines[0] else None
        height = int(lines[1]) if lines[1] else None
        fps_str = lines[2] if len(lines) > 2 else None
        
        # 解析 FPS
        fps = None
        if fps_str:
            if '/' in fps_str:
                num, den = map(int, fps_str.split('/'))
                fps = num / den if den != 0 else None
            else:
                try:
                    fps = float(fps_str)
                except ValueError:
                    fps = None
        
        return width, height, fps
    except Exception as e:
        print(f"获取视频信息失败: {e}")
        return None, None, None

def compress_video(input_path, output_path):
    """压缩单个视频"""
    print(f"\n{'='*60}")
    print(f"处理视频: {os.path.basename(input_path)}")
    
    # 获取视频信息
    width, height, fps = get_video_info(input_path)
    if width and height:
        print(f"原始分辨率: {width}x{height}")
    if fps:
        print(f"原始帧率: {fps:.2f} fps")
    
    # 获取原始文件大小
    original_size = os.path.getsize(input_path)
    original_size_mb = original_size / (1024 * 1024)
    print(f"原始大小: {original_size_mb:.2f} MB")
    
    # 构建压缩命令
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-c:v', 'h264_videotoolbox',  # macOS 硬件加速编码器
        '-b:v', BITRATE,  # 目标比特率
        '-c:a', 'copy',  # 音频流直接复制（如果存在）
        '-pix_fmt', 'yuv420p',  # 确保兼容性
        output_path
    ]
    
    success = run_command(cmd, f"压缩视频 {os.path.basename(input_path)}")
    
    if success and os.path.exists(output_path):
        # 获取压缩后文件大小
        compressed_size = os.path.getsize(output_path)
        compressed_size_mb = compressed_size / (1024 * 1024)
        compression_ratio = (1 - compressed_size / original_size) * 100
        print(f"压缩后大小: {compressed_size_mb:.2f} MB")
        print(f"压缩率: {compression_ratio:.1f}%")
        return True
    else:
        print(f"压缩失败: {os.path.basename(input_path)}")
        return False

def find_videos(directory):
    """递归查找所有视频文件"""
    video_files = []
    for ext in VIDEO_EXTENSIONS:
        # 递归查找所有匹配的视频文件
        pattern = os.path.join(directory, '**', f'*{ext}')
        video_files.extend(glob.glob(pattern, recursive=True))
    return sorted(video_files)

def main():
    """主函数"""
    print(f"开始压缩视频...")
    print(f"目录: {VIDEO_DIR}")
    print(f"比特率: {BITRATE}")
    print(f"输出后缀: '{OUTPUT_SUFFIX}'" if OUTPUT_SUFFIX else "将覆盖原文件")
    
    # 查找所有视频文件
    video_files = find_videos(VIDEO_DIR)
    
    if not video_files:
        print(f"\n未找到视频文件")
        return
    
    print(f"\n找到 {len(video_files)} 个视频文件")
    
    # 确认是否继续
    print(f"\n准备压缩 {len(video_files)} 个视频文件")
    response = input("是否继续? (y/n): ").strip().lower()
    if response != 'y':
        print("已取消")
        return
    
    # 处理每个视频
    success_count = 0
    fail_count = 0
    
    for i, video_path in enumerate(video_files, 1):
        print(f"\n进度: {i}/{len(video_files)}")
        
        # 如果已经有压缩后缀，跳过
        if OUTPUT_SUFFIX and OUTPUT_SUFFIX in os.path.basename(video_path):
            print(f"跳过已压缩文件: {os.path.basename(video_path)}")
            continue
        
        # 确定输出路径
        if OUTPUT_SUFFIX:
            # 创建新文件
            path_obj = Path(video_path)
            output_path = path_obj.parent / f"{path_obj.stem}{OUTPUT_SUFFIX}{path_obj.suffix}"
        else:
            # 覆盖原文件（先备份）
            backup_path = video_path + ".backup"
            if not os.path.exists(backup_path):
                print(f"备份原文件: {os.path.basename(video_path)}")
                os.rename(video_path, backup_path)
                video_path = backup_path
            output_path = backup_path.replace(".backup", "")
        
        # 压缩视频
        if compress_video(video_path, str(output_path)):
            success_count += 1
        else:
            fail_count += 1
    
    # 总结
    print(f"\n{'='*60}")
    print(f"压缩完成!")
    print(f"成功: {success_count} 个")
    print(f"失败: {fail_count} 个")
    print(f"总计: {len(video_files)} 个")

if __name__ == "__main__":
    main()

