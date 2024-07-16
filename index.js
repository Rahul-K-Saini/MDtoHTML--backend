const chokidar = require('chokidar');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const MarkdownIt = require('markdown-it');
const ejs = require('ejs');
const WebSocket = require('ws');

const md = new MarkdownIt();
const app = express();
const wss = new WebSocket.Server({ noServer: true });

// File processing function
async function processFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const html = md.render(content);
    const template = await fs.readFile('./templates/main.ejs', 'utf-8');
    const renderedHtml = ejs.render(template, { content: html });
    
    const outputPath = path.join('public', path.basename(filePath, '.md') + '.html');
    await fs.writeFile(outputPath, renderedHtml);
    console.log(`Generated: ${outputPath}`);
}

// Watch for file changes
chokidar.watch('src').on('all', (event, path) => {
    if (path.endsWith('.md')) {
        processFile(path);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send('refresh');
            }
        });
    }
});

// Serve static files
app.use(express.static('public'));

// Start server
const server = app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

// WebSocket setup
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit('connection', socket, request);
    });
});
