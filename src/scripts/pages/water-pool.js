const canvas = document.createElement("canvas");
const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

if (!gl) {
  document.body.classList.add("no-webgl");
} else {
  import("../../demos/water-pool/main.js");
}
