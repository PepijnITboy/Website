(function () {
  const page = document.querySelector("[data-landing-page]");
  if (!page) return;

  document.body.classList.add("landing-page");

  const reveals = Array.from(document.querySelectorAll(".landing-reveal"));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  const magneticButtons = document.querySelectorAll("[data-magnetic]");
  magneticButtons.forEach((button) => {
    const strength = 10;
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x / strength}px, ${y / strength}px)`;
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "translate(0, 0)";
    });
  });
})();
