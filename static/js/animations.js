// GSAP Animations and Interactive UI Effects
document.addEventListener('DOMContentLoaded', () => {
    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    initAnimations();

    // Make it available globally to trigger on re-renders
    window.refreshScrollTriggers = refreshScrollTriggers;
});

function initAnimations() {
    // 1. Initial Page Load Stagger Animation
    gsap.from('.stagger-el', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.1
    });

    // Sidebar animation if visible
    if(window.innerWidth > 768) {
        gsap.from('#sidebar', {
            x: -50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        });
    }
}

// 2. Fold / Unfold Scroll Animation for Task Cards
function refreshScrollTriggers() {
    // Kill existing scroll triggers to prevent duplicates
    ScrollTrigger.getAll().forEach(t => t.kill());

    const items = gsap.utils.toArray('.fold-item');

    items.forEach((item, i) => {
        // Reset state
        gsap.set(item, { clearProps: 'all' });
        
        // Ensure starting state
        gsap.set(item, { 
            opacity: 0, 
            rotationX: -40, 
            y: 40, 
            scale: 0.9,
            transformPerspective: 1000,
            transformOrigin: "top center"
        });

        // The animation
        gsap.to(item, {
            opacity: 1,
            rotationX: 0,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: item,
                containerAnimation: null,
                start: "top bottom-=50", // When the top of the item hits 50px above the bottom of the viewport
                end: "top center",
                toggleActions: "play none none none"
            }
        });
    });
}
