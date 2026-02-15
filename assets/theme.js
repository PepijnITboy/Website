(function () {
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealItems = document.querySelectorAll("[data-reveal]");
  var parallaxItems = document.querySelectorAll("[data-parallax]");

  function applyVisibilityWithoutMotion() {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
    parallaxItems.forEach(function (item) {
      item.style.transform = "none";
    });
  }

  if (prefersReduced || !("IntersectionObserver" in window)) {
    applyVisibilityWithoutMotion();
    return;
  }

  var revealObserver = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealItems.forEach(function (item) {
    revealObserver.observe(item);
  });

  if (!parallaxItems.length) return;

  var ticking = false;

  function updateParallax() {
    ticking = false;
    var viewportHeight = window.innerHeight;

    parallaxItems.forEach(function (item) {
      var strength = parseFloat(item.getAttribute("data-parallax")) || 0.06;
      var rect = item.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > viewportHeight) return;

      var distanceToCenter = rect.top + rect.height * 0.5 - viewportHeight * 0.5;
      var offset = distanceToCenter * strength * -1;
      item.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateParallax();
})();
