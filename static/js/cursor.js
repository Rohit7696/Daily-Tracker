// Custom Cursor Logic
document.addEventListener('DOMContentLoaded', () => {
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    const cursorGlow = document.getElementById('cursor-glow');
    
    // Check if device supports hover (mobile vs desktop)
    const isTouchDevice = () => {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    };

    if (isTouchDevice()) {
        if(cursorDot) cursorDot.style.display = 'none';
        if(cursorOutline) cursorOutline.style.display = 'none';
        if(cursorGlow) cursorGlow.style.display = 'none';
        return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Smooth outline follower
    let outlineX = mouseX;
    let outlineY = mouseY;
    
    let glowX = mouseX;
    let glowY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Instant dot movement
        if(cursorDot) {
            cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        }
    });

    const renderCursor = () => {
        // Outline lag
        outlineX += (mouseX - outlineX) * 0.2;
        outlineY += (mouseY - outlineY) * 0.2;
        
        // Glow deep lag
        glowX += (mouseX - glowX) * 0.05;
        glowY += (mouseY - glowY) * 0.05;

        if (cursorOutline) {
            cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px) translate(-50%, -50%)`;
        }
        
        if (cursorGlow) {
            cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
        }

        requestAnimationFrame(renderCursor);
    };
    
    renderCursor();

    // Hover effect for interactive elements
    const setupInteractiveCursors = () => {
        const interactives = document.querySelectorAll('button, a, input, select, .cursor-ring, .task-item-card, .task-checkbox');
        
        interactives.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });
    };

    // Magnetic effect for specific buttons
    const setupMagneticButtons = () => {
        const magneticButtons = document.querySelectorAll('.cursor-ring');
        
        magneticButtons.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                // Max movement 10px
                const moveX = (x / (rect.width / 2)) * 10;
                const moveY = (y / (rect.height / 2)) * 10;
                
                btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0px, 0px) scale(1)';
            });
        });
    };

    setupInteractiveCursors();
    setupMagneticButtons();
    
    // Export globally to re-run when DOM changes
    window.updateCursorInteractions = () => {
        setupInteractiveCursors();
        setupMagneticButtons();
    };
});
