import { Router } from './router.js';

const routes = {
    '/': {
        render: async () => `
            <h1>Elevating Human-Machine Interaction</h1>
            <p>Welcome to the V2 Portfolio. I'm Sahib Virdee, an Engineer focused on building robust, high-performance systems.</p>
            <div class="grid">
                <div class="card">
                    <h3>Engineering</h3>
                    <p>Building scalable solutions with a focus on efficiency and reliability.</p>
                </div>
                <div class="card">
                    <h3>Design</h3>
                    <p>Creating intuitive interfaces that bridge the gap between complex logic and user experience.</p>
                </div>
                <div class="card">
                    <h3>Research</h3>
                    <p>Exploring the frontiers of automation and intelligent systems.</p>
                </div>
            </div>
        `
    },
    '/projects': {
        render: async () => `
            <h1>Projects</h1>
            <p>A showcase of technical engineering and creative design.</p>
            <div class="grid">
                <div class="card">
                    <h3>SARIT LiDAR Mount</h3>
                    <p>V2 CAD and prototype development for autonomous navigation.</p>
                </div>
                <div class="card">
                    <h3>Arbalest Rocketry</h3>
                    <p>SolidWorks modeling and machining for high-altitude systems.</p>
                </div>
            </div>
        `
    },
    '/resume': {
        render: async () => `
            <h1>Resume</h1>
            <p>Detailed professional history and technical skills.</p>
            <div class="card">
                <h3>Experience</h3>
                <p>York University | Teaching Assistant</p>
                <p>SARIT | Engineering Intern</p>
            </div>
        `
    },
    '/about': {
        render: async () => `
            <h1>About</h1>
            <p>I build things. Usually with code, sometimes with CAD.</p>
        `
    },
    '404': {
        render: async () => `
            <h1>404 - Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/" data-link>Go back home</a>
        `
    }
};

new Router(routes);
