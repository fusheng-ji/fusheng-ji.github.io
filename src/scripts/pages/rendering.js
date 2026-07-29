document.querySelectorAll("video[data-autoplay]").forEach((video) => {
  const start = () => video.play().catch(() => {});
  if (document.visibilityState === "visible") start();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else start();
  });
});
