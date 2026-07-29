export default {
  tabs: [
    { id: "lens", label: "Through My Lens" },
    { id: "blender", label: "Blender Arts" },
    { id: "threejs", label: "Three.js Arts" },
  ],
  lens: [
    { src: "/assets/photograph/display/frankfurt.jpg", width: 1400, height: 1049, alt: "Frankfurt cityscape" },
    { src: "/assets/photograph/display/IMG_8982.webp", width: 1200, height: 674, alt: "Personal travel photograph 1" },
    { src: "/assets/photograph/display/IMG_6895.jpg", width: 1600, height: 900, alt: "Personal travel photograph 2" },
    { src: "/assets/photograph/display/IMG_7124.jpg", width: 1400, height: 787, alt: "Personal travel photograph 3" },
    { src: "/assets/photograph/display/IMG_7353.webp", width: 1200, height: 674, alt: "Personal travel photograph 4" },
    { src: "/assets/photograph/display/IMG_7432.jpg", width: 1400, height: 787, alt: "Personal travel photograph 5" },
    { src: "/assets/photograph/display/IMG_8213.webp", width: 1400, height: 787, alt: "Personal travel photograph 6" },
    { src: "/assets/photograph/display/IMG_8512.webp", width: 1400, height: 788, alt: "Personal travel photograph 7" },
    { src: "/assets/photograph/display/IMG_8514.webp", width: 1400, height: 787, alt: "Personal travel photograph 8" },
    { src: "/assets/photograph/display/IMG_8520.jpg", width: 1400, height: 787, alt: "Personal travel photograph 9" },
    { src: "/assets/photograph/display/IMG_8521.webp", width: 1200, height: 674, alt: "Personal travel photograph 10" },
    { src: "/assets/photograph/display/IMG_8677.webp", width: 1400, height: 788, alt: "Personal travel photograph 11" },
    { src: "/assets/photograph/display/IMG_8679.jpg", width: 1400, height: 787, alt: "Personal travel photograph 12" },
    { src: "/assets/photograph/display/IMG_8689.jpg", width: 1400, height: 787, alt: "Personal travel photograph 13" },
    { src: "/assets/photograph/display/IMG_8700.jpg", width: 1400, height: 787, alt: "Personal travel photograph 14" },
    { src: "/assets/photograph/display/IMG_8772.webp", width: 1400, height: 788, alt: "Personal travel photograph 15" },
    { src: "/assets/photograph/display/IMG_8775.webp", width: 1400, height: 787, alt: "Personal travel photograph 16" },
    { src: "/assets/photograph/display/IMG_8903.webp", width: 1200, height: 674, alt: "Personal travel photograph 17" }
  ],
  blender: [
    { src: "/render_arts/static/images/river0_1280.webp", width: 1280, height: 720, alt: "Blender river scene 1" },
    { src: "/render_arts/static/images/river1_1280.webp", width: 1280, height: 720, alt: "Blender river scene 2" },
    { src: "/render_arts/static/images/river2_1280.webp", width: 1280, height: 720, alt: "Blender river scene 3" },
    { src: "/render_arts/static/images/river3_1280.webp", width: 1280, height: 720, alt: "Blender river scene 4" },
    { src: "/render_arts/static/images/house_1280.webp", width: 1280, height: 720, alt: "Blender house render" },
    {
      type: "video",
      src: "/render_arts/static/videos/alien-ball-1080p.mp4",
      poster: "/render_arts/static/images/alien_ball_poster.jpg",
      width: 1920,
      height: 1080,
      alt: "Alien Ball animation"
    }
  ],
  threejs: [
    {
      title: "Interactive Thermal Receipt Simulation",
      date: "March 2026",
      subtitle: "Receipt Deformation Simulation",
      tech: "Three.js + WebGL + Verlet Cloth",
      media: {
        src: "/assets/site-media/jelly-receipt-banner_720.jpg",
        width: 720,
        height: 503,
        alt: "Interactive Thermal Receipt Simulation banner"
      },
      url: "/three_js_arts/jelly_receipt/"
    },
    {
      title: "Duck Pool: Interactive Water Simulation",
      date: "March 2026",
      subtitle: "Dive into an interactive water simulation where ducks float, collide, and create ripples.",
      tech: "Three.js + CPU Simulation",
      media: {
        src: "/assets/site-media/water-pool-banner_720.jpg",
        width: 720,
        height: 405,
        alt: "Duck Pool water simulation banner"
      },
      url: "/three_js_arts/water_pool/"
    }
  ]
};
