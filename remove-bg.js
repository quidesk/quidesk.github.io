
const Jimp = require('jimp');

async function processLogo() {
  console.log('Loading...');
  const img = await Jimp.read('src/assets/logo.jpg');
  
  // We want to make the checkerboard transparent. 
  // Let's just do a threshold or chroma key.
  // The checkerboard consists of two colors. We can check if a pixel is grayscale (R~=G~=B).
  // The logo is gold and blue. Gold has high R and G, low B. Blue has high B, low R.
  // Grayscale has R == G == B. So if Math.max(r,g,b) - Math.min(r,g,b) < 15, it's gray!
  
  console.log('Processing pixels...');
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Check if it's roughly grayscale and not too dark (the logo might have dark grays/blacks)
    // A typical checkerboard is light gray and dark gray.
    if (max - min < 20 && r > 30) {
      // It's the background! Make it transparent.
      this.bitmap.data[idx + 3] = 0; // Alpha
    }
  });
  
  console.log('Saving as PNG...');
  await img.writeAsync('src/assets/logo.png');
  console.log('Done!');
}
processLogo().catch(console.error);

