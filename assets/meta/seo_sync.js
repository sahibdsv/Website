const fs = require('fs');
const https = require('https');
const path = require('path');
const { parseFullCSV } = require('../js/csv_parser.js');

const CONFIG = {
    csvPath: path.join(__dirname, '../data/main.csv'),
    baseUrl: 'https://sahibvirdee.com',
    indexHtmlPath: path.join(__dirname, '../../index.html'),
    sitemapPath: path.join(__dirname, '../../sitemap.xml'),
    robotsPath: path.join(__dirname, '../../robots.txt')
};

function readLocalCSV(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function cleanContent(text) {
    if (!text) return '';
    return text
        .replace(/[#*`]/g, '') // Strip markdown
        .replace(/<[^>]*>/g, '') // Strip HTML
        .replace(/assets\/\S+/g, '') // Strip asset paths
        .replace(/https?:\/\/\S+/g, '') // Strip URLs
        .replace(/\n\s*\n/g, '\n') // Collapse double newlines
        .trim();
}

async function run() {
    console.log('Reading local data...');
    const csvData = readLocalCSV(CONFIG.csvPath);
    const rows = parseFullCSV(csvData);

    if (rows.length < 2) {
        console.error('No rows found in sheet.');
        return;
    }

    const header = rows[0];
    const pageIdx = header.indexOf('Page');
    const titleIdx = header.indexOf('Title');
    const contentIdx = header.indexOf('Content');

    if (pageIdx === -1 || contentIdx === -1) {
        console.error('Could not find required columns.');
        return;
    }

    // Map rows to projects
    const sheetEntries = rows.slice(1)
        .filter(r => r[pageIdx] && r[pageIdx] !== 'Footer' && r[pageIdx] !== 'Home' && !r[pageIdx].startsWith('{'))
        .map(r => ({
            path: r[pageIdx],
            title: r[titleIdx] || r[pageIdx].split('/').pop(),
            content: cleanContent(r[contentIdx])
        }));

    // Default system pages
    const defaults = [
        { path: 'Professional/Resume', title: 'Resume', content: 'Professional resume and experiences of Sahib Virdee.' },
        { path: 'Personal/About', title: 'About Me', content: 'Information about Sahib Virdee, Mechanical Design Engineer.' }
    ];

    // Combine and deduplicate by 'path'
    const entryMap = new Map();
    [...defaults, ...sheetEntries].forEach(e => {
        const key = e.path.replace(/ /g, '_');
        // Only add if it's the first time we see this path, or if the new one has more content
        if (!entryMap.has(key) || (e.content && !entryMap.get(key).content)) {
            entryMap.set(key, e);
        }
    });

    const entries = Array.from(entryMap.values());
    const uniquePaths = Array.from(entryMap.keys());

    console.log(`Discovered ${uniquePaths.length} unique indexable paths.`);

    // 1. Sitemap
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${CONFIG.baseUrl}/#</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${uniquePaths.map(p => `  <url>
    <loc>${CONFIG.baseUrl}/#${p}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(CONFIG.sitemapPath, sitemapContent);
    console.log('Sitemap.xml updated.');

    // 2. Robots.txt
    const robotsContent = `User-agent: *
Allow: /

Sitemap: ${CONFIG.baseUrl}/sitemap.xml`;
    fs.writeFileSync(CONFIG.robotsPath, robotsContent);
    console.log('Robots.txt updated.');

    // 3. index.html Injection
    let indexHtml = fs.readFileSync(CONFIG.indexHtmlPath, 'utf8');
    const startTag = '<!-- SEO_LINK_START -->';
    const endTag = '<!-- SEO_LINK_END -->';

    let seoInjection = `\n<div id="seo-content" style="display:none;" aria-hidden="true">\n`;
    seoInjection += `  <nav id="seo-nav">\n`;
    seoInjection += `    <a href="#Home">Home</a>\n`;
    uniquePaths.forEach(p => {
        const title = p.replace(/_/g, ' ');
        seoInjection += `    <a href="#${p}">${title}</a>\n`;
    });
    seoInjection += `  </nav>\n\n`;

    entries.forEach(entry => {
        const cleanPath = entry.path.replace(/ /g, '_');
        seoInjection += `  <article id="seo-content-${cleanPath}">\n`;
        seoInjection += `    <h2>${entry.title}</h2>\n`;
        seoInjection += `    <p>${entry.content}</p>\n`;
        seoInjection += `  </article>\n\n`;
    });

    seoInjection += `</div>\n`;

    const regex = new RegExp(`${startTag}[\\s\\S]*${endTag}`);
    if (regex.test(indexHtml)) {
        indexHtml = indexHtml.replace(regex, `${startTag}${seoInjection}${endTag}`);
        console.log('index.html SEO injection updated.');
    }

    fs.writeFileSync(CONFIG.indexHtmlPath, indexHtml);
}

run().catch(console.error);
