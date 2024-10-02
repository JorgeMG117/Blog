document.addEventListener("scroll", function() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll("nav ul li a");

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= (sectionTop - sectionHeight / 3)) {
            navLinks.forEach(link => {
                link.classList.remove("active");
                if (section.getAttribute("id") === link.getAttribute("href").substring(1)) {
                    link.classList.add("active");
                }
            });
        }
    });
});
