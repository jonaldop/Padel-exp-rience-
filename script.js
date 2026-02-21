// =========================================
// PADEL BUSINESS EXPERIENCE - Script
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar scroll effect ---
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    let ticking = false;

    const handleScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                // Navbar background
                if (scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }

                // Mobile CTA: show after hero
                const mobileCta = document.getElementById('mobileCta');
                if (mobileCta) {
                    if (scrollY > window.innerHeight * 0.6) {
                        mobileCta.classList.add('show');
                    } else {
                        mobileCta.classList.remove('show');
                    }

                    // Hide CTA when on inscription section
                    const inscriptionSection = document.getElementById('inscription');
                    if (inscriptionSection) {
                        const rect = inscriptionSection.getBoundingClientRect();
                        if (rect.top < window.innerHeight && rect.bottom > 0) {
                            mobileCta.classList.remove('show');
                        }
                    }
                }

                // Active nav link
                highlightNav(scrollY);

                lastScroll = scrollY;
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Mobile nav toggle ---
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Close mobile nav on outside tap
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') &&
            !navLinks.contains(e.target) &&
            !navToggle.contains(e.target)) {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        }
    });

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                const offset = 70;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // --- Scroll animations (Intersection Observer) ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for fade-in animations
    document.querySelectorAll(
        '.highlight-card, .reason-card, .pricing-card'
    ).forEach((el, index) => {
        el.style.transitionDelay = `${(index % 4) * 0.1}s`;
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Timeline items
    document.querySelectorAll('.timeline-item').forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.12}s`;
        observer.observe(item);
    });

    // --- Form submission ---
    const form = document.getElementById('inscriptionForm');
    const formSuccess = document.getElementById('formSuccess');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            // Log data (replace with actual API call)
            console.log('Inscription data:', data);

            // Show success message
            form.querySelector('.form-grid').style.display = 'none';
            form.querySelector('.form-submit').style.display = 'none';
            formSuccess.classList.add('show');

            // Hide mobile CTA
            const mobileCta = document.getElementById('mobileCta');
            if (mobileCta) mobileCta.classList.remove('show');

            // Scroll to success message
            setTimeout(() => {
                formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });
    }

    // --- Active nav link on scroll ---
    const sections = document.querySelectorAll('section[id]');

    const highlightNav = (scrollY) => {
        const currentY = (scrollY || window.pageYOffset) + 120;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (currentY >= sectionTop && currentY < sectionTop + sectionHeight) {
                navLinks.querySelectorAll('a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    // --- Initial state ---
    handleScroll();

});
