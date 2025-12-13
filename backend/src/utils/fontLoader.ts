import https from 'https';
import fs from 'fs';
import path from 'path';

const FONT_DIR = path.join(__dirname, '../assets/fonts');
const FONTS = {
  regular: {
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    filename: 'NotoSans-Regular.ttf'
  },
  bold: {
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
    filename: 'NotoSans-Bold.ttf'
  }
};

export async function ensureFontsLoaded(): Promise<{ regular: string; bold: string }> {
  // Create font directory if it doesn't exist
  if (!fs.existsSync(FONT_DIR)) {
    fs.mkdirSync(FONT_DIR, { recursive: true });
  }

  const fontPaths = {
    regular: path.join(FONT_DIR, FONTS.regular.filename),
    bold: path.join(FONT_DIR, FONTS.bold.filename)
  };

  // Check if fonts already exist
  const regularExists = fs.existsSync(fontPaths.regular);
  const boldExists = fs.existsSync(fontPaths.bold);

  if (regularExists && boldExists) {
    return fontPaths;
  }

  // Download missing fonts
  const downloadPromises: Promise<void>[] = [];

  if (!regularExists) {
    downloadPromises.push(downloadFont(FONTS.regular.url, fontPaths.regular));
  }

  if (!boldExists) {
    downloadPromises.push(downloadFont(FONTS.bold.url, fontPaths.bold));
  }

  await Promise.all(downloadPromises);
  return fontPaths;
}

function downloadFont(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath); // Delete incomplete file
          downloadFont(redirectUrl, destPath).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect without location header`));
        }
      } else {
        file.close();
        fs.unlinkSync(destPath); // Delete incomplete file
        reject(new Error(`Failed to download font: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath); // Delete incomplete file
      }
      reject(err);
    });
  });
}
