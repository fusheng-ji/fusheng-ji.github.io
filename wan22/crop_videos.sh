#!/bin/bash
# 从每个视频中删除倒数第二列（ours wan2.2，第7列，x=3072~3583，每列512px）
# 保留前6列（x=0~3071）和最后1列（x=3584~4095），拼接为 3584x512
# 并去除每个视频的前两帧和后两帧

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
# 前6列: x=0, w=3072; 最后1列: x=3584, w=512
# 结果: 3072+512 = 3584 宽

success=0
fail=0

process_video() {
    local input="$1"
    local total_frames

    local width
    width=$(ffprobe -v quiet -select_streams v:0 \
        -show_entries stream=width \
        -of default=noprint_wrappers=1:nokey=1 "$input" </dev/null 2>/dev/null)

    if [[ "$width" != "4096" ]]; then
        echo "  SKIP (already processed, width=${width}): $input"
        ((success++))
        return
    fi

    total_frames=$(ffprobe -v quiet -select_streams v:0 \
        -count_packets -show_entries stream=nb_read_packets \
        -of default=noprint_wrappers=1:nokey=1 "$input" </dev/null 2>/dev/null)

    if [[ -z "$total_frames" || "$total_frames" -le 4 ]]; then
        echo "  SKIP: 帧数不足或无法读取 ($total_frames frames): $input"
        ((fail++))
        return
    fi

    local end_frame=$(( total_frames - 2 ))
    local tmp="${input%.mp4}_tmp.mp4"

    # 先 trim 去掉前后各2帧，然后分割成左(6列)和右(1列)，再 hstack 拼接
    ffmpeg -y -i "$input" \
        -filter_complex "
            [0:v]trim=start_frame=2:end_frame=${end_frame},setpts=PTS-STARTPTS[v];
            [v]split=2[left][right];
            [left]crop=3072:512:0:0[l];
            [right]crop=512:512:3584:0[r];
            [l][r]hstack=inputs=2[out]
        " \
        -map "[out]" \
        -c:v h264_videotoolbox -b:v 3M \
        -an \
        "$tmp" </dev/null 2>/dev/null

    if [[ $? -eq 0 ]]; then
        mv "$tmp" "$input"
        echo "  OK: $input"
        ((success++))
    else
        rm -f "$tmp"
        echo "  FAIL: $input"
        ((fail++))
    fi
}

echo "=== 处理 cross 目录 ==="
while IFS= read -r -d '' mp4; do
    echo "Processing: $mp4"
    process_video "$mp4"
done < <(find "$BASE_DIR/cross" -name "*.mp4" -print0)

echo ""
echo "=== 处理 self 目录 ==="
while IFS= read -r -d '' mp4; do
    echo "Processing: $mp4"
    process_video "$mp4"
done < <(find "$BASE_DIR/self" -name "*.mp4" -print0)

echo ""
echo "=== 完成 ==="
echo "成功: $success  失败: $fail"
