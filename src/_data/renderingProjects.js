const releaseBase =
  "https://github.com/fusheng-ji/fusheng-ji.github.io/releases/download/site-assets-v1";

export default [
  {
    id: "dandelion-river",
    title: "🌼 Dandelion River 🏞",
    meta: "Blender 3.5 | 2023/5",
    media: [
      { src: "/render_arts/static/images/river0_1280.webp", width: 1280, height: 720, alt: "Dandelion river render wide view" },
      { src: "/render_arts/static/images/river1_1280.webp", width: 1280, height: 720, alt: "Dandelion river render close view" },
      { src: "/render_arts/static/images/river2_1280.webp", width: 1280, height: 720, alt: "Dandelion river render side view" },
      { src: "/render_arts/static/images/river3_1280.webp", width: 1280, height: 720, alt: "Dandelion river render final view" },
    ],
    project: `${releaseBase}/river.blend`,
    tutorial: "https://www.youtube.com/watch?v=FVjsmC-UThg",
  },
  {
    id: "metal-planet",
    title: "🔩 Metal Planet 🌍",
    meta: "Blender 3.1.2 | 2022/5",
    media: [
      { src: "/render_arts/static/images/geo_1280.webp", width: 1280, height: 720, alt: "Metal planet Blender render" },
    ],
    project: `${releaseBase}/geo.blend`,
    tutorial: "https://www.youtube.com/watch?v=K5eNdCpoRD4",
  },
  {
    id: "alien-starship",
    title: "👽 Alien Starship 🛸",
    meta: "Blender 3.1.2 | 2022/5",
    video: {
      src: "/render_arts/static/videos/alien-ball-1080p.mp4",
      poster: "/render_arts/static/images/alien_ball_poster.jpg",
      width: 1920,
      height: 1080,
      alt: "Alien starship animation",
    },
    project: `${releaseBase}/alien_ball.blend`,
    tutorial: "https://www.youtube.com/watch?v=t_Xfl9Nub-I",
  },
  {
    id: "mushroom-bottle",
    title: "🍄 Cute Mushroom Bottle 🍾",
    meta: "Blender 3.1.2 | 2022/4",
    media: [
      { src: "/render_arts/static/images/mushroom_bottle_1280.webp", width: 1280, height: 1280, alt: "Cute mushroom bottle Blender render" },
    ],
    project: `${releaseBase}/mushroom.blend`,
    tutorial: "https://www.youtube.com/watch?v=kbiMXiUz9cc",
  },
  {
    id: "snowy-house",
    title: "🌨 Snowy Winter House 🏠",
    meta: "Blender 3.1.2 | 2022/4",
    media: [
      { src: "/render_arts/static/images/house_1280.webp", width: 1280, height: 720, alt: "Snowy winter house Blender render" },
    ],
    project: `${releaseBase}/house.blend`,
    tutorial: "https://www.youtube.com/watch?v=jYXZYKRDj4g&t=1217s",
  },
];
