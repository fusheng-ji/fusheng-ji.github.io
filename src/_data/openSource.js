import { readFileSync, existsSync } from "node:fs";
import { validateSnapshot } from "../../scripts/lib/contributions.mjs";
import { contributionView } from "../../scripts/lib/contribution-view.mjs";
import { contributionPresentation } from "../../scripts/lib/contribution-presentation.mjs";
import contributionDetails from "./openSourceDetails.js";

const featured = (repository, number, description) => ({ repository, number, description });

const repositorySummaries = {
  "sgl-project/sglang": "Native diffusion model integration, sequence-parallel numerical consistency, and CFG-aware cache lifecycles.",
  "huggingface/diffusers": "CFG-aware cache integration and request-lifecycle validation for Wan video-to-video pipelines.",
  "Dao-AILab/flash-attention": "SM100 attention scheduling, asymmetric backward correctness, and NaN-safe KV-cache loads.",
  "modelscope/DiffSynth-Studio": "Memory-efficient tiled Qwen-Image VAE encoding and decoding for high-resolution generation.",
  "vllm-project/vllm-omni": "CFG-aware TeaCache isolation and request-failure recovery for diffusion serving.",
  "hao-ai-lab/FastVideo": "Fused Triton layout transforms, Wan-VACE model integration, and SM100 attention quantization kernels.",
  "xdit-project/xDiT": "Wan tensor-layout optimization, sequence-parallel numerical consistency, and distributed VAE coordination.",
  "RL-Align/RL-Kernel": "Deterministic attention and memory-efficient log-probability kernels, plus TP/EP rollout–recompute parity.",
};

// Concise project descriptions grounded in the upstream README; contribution
// summaries above describe Wenbo's own work separately.
const repositoryIntros = {
  "sgl-project/sglang": {
    text: "An inference and serving framework for large language, vision-language, and diffusion models.",
    source: "https://github.com/sgl-project/sglang",
  },
  "huggingface/diffusers": {
    text: "A modular diffusion library for image, video, and audio generation.",
    source: "https://github.com/huggingface/diffusers",
  },
  "Dao-AILab/flash-attention": {
    text: "GPU attention kernels that accelerate exact attention while reducing memory use.",
    source: "https://github.com/Dao-AILab/flash-attention",
  },
  "modelscope/DiffSynth-Studio": {
    text: "A diffusion model engine for image, video, and audio generation, with support for inference and training.",
    source: "https://github.com/modelscope/DiffSynth-Studio",
  },
  "vllm-project/vllm-omni": {
    text: "A serving framework for multimodal generation across text, images, audio, and video.",
    source: "https://github.com/vllm-project/vllm-omni",
  },
  "hao-ai-lab/FastVideo": {
    text: "An inference and post-training framework for accelerating video generation.",
    source: "https://github.com/hao-ai-lab/FastVideo",
  },
  "xdit-project/xDiT": {
    text: "A distributed inference engine that scales diffusion transformers across multiple GPUs.",
    source: "https://github.com/xdit-project/xDiT",
  },
  "RL-Align/RL-Kernel": {
    text: "RL post-training infrastructure with deterministic operators for consistent computation across training and rollout engines.",
    source: "https://github.com/RL-Align/RL-Kernel",
  },
};

// Selection order expresses editorial priority within a repository. Sync only
// refreshes metadata; new PRs need a technical review before joining this list.
const selection = [
  featured("sgl-project/sglang", 43152, "Native Ovis-Image 7B with TP/Ulysses/CFG; single-GPU output bit-exact vs Diffusers, with four-B200 replay checked against BF16 control error."),
  featured("sgl-project/sglang", 43242, "Correct head-shard-dependent SDPA reductions; restore bit-identical attention in tested exact-tier, two-B200 sequence-parallel cases."),
  featured("sgl-project/sglang", 42422, "Isolate TeaCache by CFG branch and reset request state; reused Wan instances match fresh execution bit-for-bit on one and two B200s."),
  featured("Dao-AILab/flash-attention", 2983, "Bound TMA zero-fill by sequence length to prevent NaN contamination in SM100 KV-cache loads; 146 GPU regression cases pass."),
  featured("Dao-AILab/flash-attention", 2976, "Integrate co-authored CLC L2 swizzling with STATIC 2CTA compatibility; 1.039× geomean speedup over 180 B200 1CTA/CLC shapes."),
  featured("Dao-AILab/flash-attention", 2975, "Fix TMEM/SMEM dV epilogue staging for asymmetric attention head dimensions, preventing silent MHA/GQA gradient errors."),
  featured("modelscope/DiffSynth-Studio", 1720, "Enable overlapping QwenImageVAE tiling: isolated 2048² BF16 encode/decode peaks fall from 7.77/8.53 to 2.15/2.43 GiB on one B200."),
  featured("vllm-project/vllm-omni", 8475, "Separate conditional and unconditional TeaCache state through a shared CFG context, preventing cross-branch cache contamination."),
  featured("vllm-project/vllm-omni", 8450, "Isolate request failures and abort partially submitted batches while keeping a healthy inference engine available for subsequent requests."),
  featured("hao-ai-lab/FastVideo", 1900, "Fuse VSA64 scatter and layout transforms in Triton: Wan2.1-14B 50-step inference runs 1.155×/1.145× faster on one/two B200s, with bitwise-equal outputs."),
  featured("hao-ai-lab/FastVideo", 1903, "Integrate Wan-VACE 1.3B/14B control streams, checkpoint mapping, and sequence parallelism for image, video, and mask conditioning."),
  featured("hao-ai-lab/FastVideo", 1899, "Optimize SM100 Attn-QAT tiling; a fixed-batch Wan2.1-1.3B training step takes 10.9% less time on two B200s, preserving outputs and gradients bit-for-bit."),
  featured("xdit-project/xDiT", 861, "Restore contiguous Wan patch embeddings: two-B200 Ulysses/Ring inference latency falls 6.3%/7.0% for Wan1.3B, with bit-identical outputs."),
  featured("xdit-project/xDiT", 851, "Track valid tokens through sequence-parallel padding and joint attention; recover reference outputs across tested diffusion models on an eight-B200 node."),
  featured("xdit-project/xDiT", 902, "Coordinate data-parallel prompt sharding, output-owner ranks, and parallel VAE decoding; validate combined parallel configurations on an eight-B200 node."),
  featured("RL-Align/RL-Kernel", 576, "Fixed-order Triton H3 attention with batch/head-invariant forward and backward: up to 48× vs the strict deterministic reference on H100; still slower than SDPA."),
  featured("RL-Align/RL-Kernel", 543, "Integrate Qwen3-Next TP4 vLLM rollout and Megatron recompute; verify bitwise parity over two updates and checkpoint reload on four B200s (EP1)."),
  featured("RL-Align/RL-Kernel", 557, "Extend Qwen3-Next rollout–recompute parity to TP4×EP4 on four B200s using fixed-order expert routing; EP4 training remains unsupported."),
  featured("RL-Align/RL-Kernel", 495, "Implement memory-efficient CUDA log-probability backward: BF16 32768×151936 peak memory drops from 46.37 to 9.27 GiB on B200, trading throughput for memory."),
  featured("huggingface/diffusers", 14948, "Integrate CFG-aware TaylorSeer, FirstBlockCache, and MagCache for Wan video-to-video; validate cache-off parity and request cleanup on one B200."),
];

const cachePath = new URL("../../.cache/contributions.json", import.meta.url);
const seedSnapshot = JSON.parse(readFileSync(new URL("./open-source-snapshot.json", import.meta.url), "utf8"));
const repositoryMedia = JSON.parse(readFileSync(new URL("../../public/assets/open-source/manifest.json", import.meta.url), "utf8"));

function readSnapshot() {
  if (existsSync(cachePath)) {
    try {
      return validateSnapshot(JSON.parse(readFileSync(cachePath, "utf8")), selection);
    } catch (error) {
      console.warn(`Ignoring invalid contribution cache: ${error.message}`);
    }
  }
  return validateSnapshot(seedSnapshot, selection);
}

export default function ({ configurationOnly = false } = {}) {
  if (configurationOnly) return { selection, contributionDetails, repositorySummaries, repositoryIntros, repositoryMedia, seedSnapshot, cachePath };
  const snapshot = readSnapshot();
  const view = contributionPresentation(contributionView(snapshot, selection, repositorySummaries), contributionDetails);
  return {
    selection, contributionDetails, repositoryIntros, repositoryMedia, snapshot,
    ...view,
  };
}
