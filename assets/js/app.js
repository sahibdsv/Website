import { Router } from './router.js';

const CONFIG = {
    DEFAULT_CATEGORY: 'projects', // Change this to 'personal' or 'professional' to swap the landing page
    THEMES: {
        personal: '#00FF00',
        professional: '#00FFFF',
        projects: '#FFA500'
    }
};

class App {
    constructor() {
        this.gridContainer = document.getElementById('grid-container');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.router = new Router((category) => {
            const finalCategory = category === 'default' ? CONFIG.DEFAULT_CATEGORY : category;
            this.updateTheme(finalCategory);
            this.renderGrid(finalCategory);
        });
    }

    updateTheme(category) {
        const color = CONFIG.THEMES[category];
        document.documentElement.style.setProperty('--highlight', color);
        
        // Update Nav UI
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-category') === category);
        });
    }

    async renderGrid(category) {
        this.gridContainer.innerHTML = ''; // Clear existing
        
        // Mock data for demonstration - in real app, this will fetch from Google Sheets CSV
        const mockItems = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            is3D: i % 3 === 0,
            poster: `https://picsum.photos/seed/${category}${i}/800/800`,
            model: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
        }));

        mockItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'thumb-item';
            
            if (item.is3D && !this.isMobile()) {
                div.innerHTML = `
                    <model-viewer 
                        class="thumb-media" 
                        src="${item.model}" 
                        poster="${item.poster}" 
                        loading="lazy"
                        camera-controls 
                        auto-rotate 
                        interaction-prompt="none"
                        shadow-intensity="1">
                    </model-viewer>
                `;
            } else {
                div.innerHTML = `
                    <img class="thumb-media" src="${item.poster}" loading="lazy" alt="Gallery item">
                `;
            }

            this.gridContainer.appendChild(div);
        });
    }

    isMobile() {
        return window.matchMedia("(pointer: coarse)").matches;
    }
}

// Boot the app
new App();
