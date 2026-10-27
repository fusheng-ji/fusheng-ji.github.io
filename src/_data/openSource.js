import { readFileSync, existsSync } from "node:fs";
import { validateSnapshot } from "../../scripts/lib/contributions.mjs";
import { contributionView } from "../../scripts/lib/contribution-view.mjs";

const categories = [
  { id: "distributed", label: "Distributed Inference", theme: "perception" },
  { id: "kernels", label: "GPU Kernels", theme: "embodied" },
  { id: "generative", label: "Generative Models", theme: "generation" },
  { id: "serving", label: "Inference Serving", theme: "perception" },
  { id: "rendering", label: "3D Rendering", theme: "representation" },
];

const featured = (repository, number, description, category, mechanism) => ({
  repository, number, description, category, mechanism,
});

const repositorySummaries = {
  "sgl-project/sglang": "CFG-aware cache isolation and request lifecycles for diffusion inference.",
  "huggingface/diffusers": "Modular pipeline callbacks, interruption, and nested progress reporting.",
  "Dao-AILab/flash-attention": "SM100 attention scheduling, backward staging, and NaN-safe KV-cache loads.",
  "modelscope/DiffSynth-Studio": "Tiled Qwen-Image VAE encoding and decoding for high-resolution generation.",
  "vllm-project/vllm-omni": "CFG-aware TeaCache isolation and request-failure recovery for diffusion serving.",
  "hao-ai-lab/FastVideo": "Wan-VACE integration, fused Triton layout transforms, and SM100 attention quantization kernels.",
  "xdit-project/xDiT": "Sequence-parallel padding, parallel VAE coordination, and distributed diffusion model integration.",
  "RL-Align/RL-Kernel": "Deterministic Triton H3 attention and CUDA normalization kernels for Qwen3-Next.",
};

// Selection order expresses editorial priority within a repository. Sync only
// refreshes metadata; new PRs need a technical review before joining this list.
const selection = [
  featured("sgl-project/sglang", 42422, "TeaCache lifecycle isolation across serial and parallel CFG.", "distributed", "TeaCache"),
  featured("sgl-project/sglang", 42423, "Spectrum forecasts and resets scoped to each CFG branch.", "distributed", "Spectrum"),
  featured("huggingface/diffusers", 14942, "Modular pipeline callbacks, interruption, and nested progress.", "generative", "Pipeline APIs"),
  featured("Dao-AILab/flash-attention", 2983, "NaN-safe SM100 KV-cache loads with sequence-bounded TMA zero-fill.", "kernels", "TMA / SM100"),
  featured("Dao-AILab/flash-attention", 2976, "SM100 CLC scheduling with L2 swizzling and STATIC 2CTA geometry.", "kernels", "CuTe / SM100"),
  featured("Dao-AILab/flash-attention", 2975, "SM100 dV epilogue staging for asymmetric head dimensions.", "kernels", "CuTe / SM100"),
  featured("modelscope/DiffSynth-Studio", 1720, "Tiled QwenImageVAE encoding and decoding for high-resolution images.", "generative", "Tiled VAE"),
  featured("vllm-project/vllm-omni", 8450, "Request-failure isolation and partial-batch cleanup without shutting down a healthy engine.", "serving", "Request Lifecycle"),
  featured("vllm-project/vllm-omni", 8483, "Explicit CFG branch tracking for TeaCache across interleaved execution.", "serving", "CFG State"),
  featured("vllm-project/vllm-omni", 8475, "Separate TeaCache state for conditional and unconditional CFG.", "serving", "Cache Isolation"),
  featured("hao-ai-lab/FastVideo", 1903, "Wan2.1-VACE generation with image, video, and mask controls.", "generative", "Wan-VACE"),
  featured("hao-ai-lab/FastVideo", 1900, "Fused VSA64 scatter and layout transforms in Triton on SM100.", "kernels", "Triton"),
  featured("hao-ai-lab/FastVideo", 1899, "SM100 Attn-QAT forward loops and backward tiling for long sequences.", "kernels", "Attn-QAT"),
  featured("xdit-project/xDiT", 851, "Sequence-parallel padding and joint-token handling across diffusion transformers.", "distributed", "Ulysses / Ring"),
  featured("xdit-project/xDiT", 902, "Coordinate data parallelism, output ranks, and parallel VAE decoding.", "distributed", "DP / Parallel VAE"),
  featured("xdit-project/xDiT", 852, "Cosmos3 output contracts for single-GPU and sequence-parallel inference.", "distributed", "Cosmos3"),
  featured("xdit-project/xDiT", 823, "Wan2.1 integration with distributed runners and precision settings.", "distributed", "Wan2.1"),
  featured("RL-Align/RL-Kernel", 576, "Fixed-order Triton H3 attention with deterministic forward and backward passes.", "kernels", "Triton / H3"),
  featured("RL-Align/RL-Kernel", 467, "Qwen3-Next zero-centred RMSNorm CUDA forward and backward kernels.", "kernels", "CUDA"),
  featured("RL-Align/RL-Kernel", 468, "Qwen3-Next gated RMSNorm CUDA kernel for Gated DeltaNet.", "kernels", "CUDA"),
];

const cachePath = new URL("../../.cache/contributions.json", import.meta.url);
const seedSnapshot = JSON.parse(readFileSync(new URL("./open-source-snapshot.json", import.meta.url), "utf8"));

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
  if (configurationOnly) return { selection, categories, repositorySummaries, seedSnapshot, cachePath };
  const snapshot = readSnapshot();
  const view = contributionView(snapshot, selection, categories, repositorySummaries);
  return {
    selection, categories, seedSnapshot, cachePath, snapshot,
    ...view,
    updatedDate: snapshot.fetchedAt.slice(0, 10),
    allPullRequestsUrl: "https://github.com/search?q=is%3Apr+is%3Apublic+author%3Afusheng-ji+-user%3Afusheng-ji&type=pullrequests",
  };
}
