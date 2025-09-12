// Simple script to create basic PNG icons for the Chrome extension
// Run this in a browser console or Node.js environment

function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background circle
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Inner white circle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Document icon (simplified)
    const docSize = size * 0.6;
    const docX = (size - docSize) / 2;
    const docY = (size - docSize) / 2;
    
    ctx.fillStyle = '#667eea';
    ctx.fillRect(docX, docY, docSize, docSize * 0.8);
    
    // Lines on document
    ctx.fillStyle = 'white';
    const lineHeight = docSize * 0.1;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(docX + docSize * 0.1, docY + docSize * 0.2 + i * lineHeight, docSize * 0.6, lineHeight * 0.3);
    }
    
    // Convert to blob and download
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon${size}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Instructions for use:
console.log('To create icons, run these commands in browser console:');
console.log('createIcon(16);');
console.log('createIcon(32);');
console.log('createIcon(48);');
console.log('createIcon(128);');

// Auto-create all icons if in browser
if (typeof document !== 'undefined') {
    setTimeout(() => createIcon(16), 100);
    setTimeout(() => createIcon(32), 200);
    setTimeout(() => createIcon(48), 300);
    setTimeout(() => createIcon(128), 400);
}
