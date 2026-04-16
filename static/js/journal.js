document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bookContainer = document.getElementById('the-book');
    const bookCover = document.getElementById('book-cover');
    const prevBtn = document.getElementById('btn-prev-day');
    const nextBtn = document.getElementById('btn-next-day');
    const displayDate = document.getElementById('display-date');
    const pageDateHeader = document.getElementById('page-date-header');
    const journalInput = document.getElementById('journal-input');
    const saveStatus = document.getElementById('save-status');
    const saveIcon = document.getElementById('save-icon');
    const pageNumLeft = document.getElementById('page-num-left');
    const pageNumRight = document.getElementById('page-num-right');
    const flipPage = document.getElementById('flip-page');
    
    // State
    const today = new Date();
    let currentDate = new Date();
    let isBookOpen = false;
    let saveTimeout = null;
    
    // Formatting helpers
    const formatDateObj = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    
    const friendlyDate = (d) => {
        const diffTime = Math.abs(today - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (formatDateObj(d) === formatDateObj(today)) return 'Today';
        if (formatDateObj(d) === formatDateObj(new Date(today.getTime() - 86400000))) return 'Yesterday';
        if (formatDateObj(d) === formatDateObj(new Date(today.getTime() + 86400000))) return 'Tomorrow';
        
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return d.toLocaleDateString('en-US', options);
    };

    // Update UI based on currentDate
    const updateUI = () => {
        const dateStr = formatDateObj(currentDate);
        displayDate.textContent = friendlyDate(currentDate);
        pageDateHeader.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        // Handle next button disabled if today
        if (dateStr === formatDateObj(today)) {
            nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            nextBtn.disabled = true;
        } else {
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            nextBtn.disabled = false;
        }
        
        // Page numbering (pseudo)
        const diffFromToday = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
        const basePage = 100 - (diffFromToday * 2);
        pageNumLeft.textContent = basePage - 1;
        pageNumRight.textContent = basePage;
    };

    // API Calls
    const fetchJournal = async (dateStr) => {
        journalInput.value = "Loading magical ink...";
        journalInput.disabled = true;
        try {
            const res = await fetch(`/api/journal/${dateStr}`);
            const data = await res.json();
            journalInput.value = data.content || '';
        } catch (e) {
            journalInput.value = "";
            console.error("Failed to load journal", e);
        }
        journalInput.disabled = false;
    };

    const saveJournal = async () => {
        const dateStr = formatDateObj(currentDate);
        const content = journalInput.value;
        
        saveStatus.textContent = "Saving...";
        saveStatus.classList.remove('opacity-0');
        saveIcon.setAttribute('data-lucide', 'loader');
        lucide.createIcons();
        saveIcon.classList.add('animate-spin');
        
        try {
            const res = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, content })
            });
            if(res.ok) {
                saveStatus.textContent = "Saved";
                saveIcon.classList.remove('animate-spin');
                saveIcon.setAttribute('data-lucide', 'check-circle');
                lucide.createIcons();
                setTimeout(() => { saveStatus.classList.add('opacity-0'); }, 2000);
            }
        } catch (e) {
            console.error("Save failed", e);
            saveStatus.textContent = "Error saving";
        }
    };

    // Event Listeners
    bookCover.addEventListener('click', () => {
        if (!isBookOpen) {
            isBookOpen = true;
            bookContainer.classList.add('is-open');
            setTimeout(() => {
                bookCover.classList.add('pointer-events-none');
            }, 600);
            
            // Generate some magic particles
            generateParticles();
        }
    });

    journalInput.addEventListener('input', () => {
        saveIcon.setAttribute('data-lucide', 'pen-tool');
        lucide.createIcons();
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveJournal();
        }, 1500); // Debounce 1.5s
    });

    // Page Turning Animation Logic
    const animatePageTurn = async (direction) => {
        // Show flip page
        flipPage.classList.remove('hidden');
        flipPage.classList.remove('page-flipped');
        
        if (direction === 'prev') {
            // Turning backward in time
            flipPage.style.transform = 'rotateY(0deg)';
            flipPage.style.transition = 'transform 0.6s ease-in-out';
            
            // Force reflow
            void flipPage.offsetWidth;
            
            flipPage.style.transform = 'rotateY(-180deg)';
        } else {
            // Turning forward in time
            flipPage.classList.add('page-flipped');
            flipPage.style.transition = 'transform 0.6s ease-in-out';
            
            // Force reflow
            void flipPage.offsetWidth;
            
            flipPage.style.transform = 'rotateY(0deg)';
        }
        
        return new Promise(resolve => setTimeout(() => {
            flipPage.classList.add('hidden');
            resolve();
        }, 600));
    };

    prevBtn.addEventListener('click', async () => {
        if (!isBookOpen) return;
        currentDate.setDate(currentDate.getDate() - 1);
        const prevStr = formatDateObj(currentDate);
        
        await animatePageTurn('prev');
        updateUI();
        await fetchJournal(prevStr);
    });

    nextBtn.addEventListener('click', async () => {
        if (!isBookOpen) return;
        const testDateStr = formatDateObj(currentDate);
        const todayStr = formatDateObj(today);
        if (testDateStr === todayStr) return; // Prevent future
        
        currentDate.setDate(currentDate.getDate() + 1);
        const nextStr = formatDateObj(currentDate);
        
        await animatePageTurn('next');
        updateUI();
        await fetchJournal(nextStr);
    });

    // Magical Particles
    const generateParticles = () => {
        const container = document.getElementById('magic-particles');
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                // Randomize
                const size = Math.random() * 4 + 2;
                const left = Math.random() * 100;
                const top = 50 + Math.random() * 50; // Bottom half
                const duration = Math.random() * 2 + 2; // 2-4s
                
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${left}%`;
                particle.style.top = `${top}%`;
                particle.style.animation = `floatUp ${duration}s ease-in forwards`;
                
                container.appendChild(particle);
                
                // Cleanup
                setTimeout(() => {
                    if (container.contains(particle)) {
                        particle.remove();
                    }
                }, duration * 1000);
            }, i * 100);
        }
    };

    // Initialize
    updateUI();
    fetchJournal(formatDateObj(currentDate));
});
