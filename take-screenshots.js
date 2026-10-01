/**
 * Automated Screenshot Script for Local Stream Server
 * Captures 4 screenshots for GitHub README
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find Chrome installation
function findChrome() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`✓ Found Chrome: ${chromePath}`);
      return chromePath;
    }
  }

  throw new Error('Chrome not found! Please install Google Chrome.');
}

async function takeScreenshots() {
  console.log('\n===========================================');
  console.log('📸 Local Stream Server Screenshot Tool');
  console.log('===========================================\n');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
    console.log('✓ Created screenshots directory');
  }

  const chromePath = findChrome();
  
  console.log('\n🚀 Launching browser...');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const baseURL = 'http://localhost:8000';
    
    // Screenshot 1: Dashboard (Empty State)
    console.log('\n📸 Screenshot 1/4: Dashboard (Empty State)');
    await page.goto(baseURL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for animations
    await page.screenshot({
      path: path.join(screenshotsDir, '1-dashboard-empty.png'),
      fullPage: false
    });
    console.log('✓ Saved: screenshots/1-dashboard-empty.png');

    // Screenshot 2: Stream Key Modal
    console.log('\n📸 Screenshot 2/4: Stream Key Generation Modal');
    await page.click('button:has-text("New Stream Key"), button:has-text("Create Stream")');
    await page.waitForTimeout(500);
    await page.type('input[type="text"]', 'Test Stream for GitHub');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, '2-stream-key-modal.png'),
      fullPage: false
    });
    console.log('✓ Saved: screenshots/2-stream-key-modal.png');

    // Screenshot 3: Dashboard with Stream Keys
    console.log('\n📸 Screenshot 3/4: Dashboard with Generated Streams');
    await page.click('button:has-text("Generate"), button:has-text("Create"), button:has-text("OK")');
    await page.waitForTimeout(1000);
    
    // Create 2 more stream keys for visual richness
    await page.click('button:has-text("New Stream Key"), button:has-text("Create Stream")');
    await page.waitForTimeout(300);
    await page.type('input[type="text"]', 'OBS Test - 1080p60');
    await page.click('button:has-text("Generate"), button:has-text("Create"), button:has-text("OK")');
    await page.waitForTimeout(800);

    await page.click('button:has-text("New Stream Key"), button:has-text("Create Stream")');
    await page.waitForTimeout(300);
    await page.type('input[type="text"]', 'vMix Encoder Test');
    await page.click('button:has-text("Generate"), button:has-text("Create"), button:has-text("OK")');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '3-dashboard-with-streams.png'),
      fullPage: false
    });
    console.log('✓ Saved: screenshots/3-dashboard-with-streams.png');

    // Screenshot 4: Settings/Info Panel
    console.log('\n📸 Screenshot 4/4: Server Info Panel');
    // Try to find and click server info or a stream card
    try {
      await page.click('.stream-card');
      await page.waitForTimeout(500);
    } catch (e) {
      console.log('  (Using current view)');
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, '4-stream-details.png'),
      fullPage: false
    });
    console.log('✓ Saved: screenshots/4-stream-details.png');

    console.log('\n===========================================');
    console.log('✅ All screenshots captured successfully!');
    console.log('===========================================\n');
    console.log('📁 Location: screenshots/');
    console.log('   - 1-dashboard-empty.png');
    console.log('   - 2-stream-key-modal.png');
    console.log('   - 3-dashboard-with-streams.png');
    console.log('   - 4-stream-details.png\n');
    console.log('📝 Next: Add these to README.md\n');

  } catch (error) {
    console.error('\n❌ Error taking screenshots:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure server is running: npm start');
    console.error('  2. Check http://localhost:8000 opens in browser');
    console.error('  3. Ensure Chrome is installed\n');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Main execution
console.log('\nChecking if server is running...');
try {
  const http = require('http');
  const req = http.get('http://localhost:8000', (res) => {
    console.log('✓ Server is running\n');
    takeScreenshots().then(() => process.exit(0));
  });
  
  req.on('error', (err) => {
    console.error('\n❌ Server not running!');
    console.error('\nPlease start the server first:');
    console.error('  npm start\n');
    console.error('Then run this script in a new terminal:');
    console.error('  node take-screenshots.js\n');
    process.exit(1);
  });
} catch (error) {
  console.error('Error checking server:', error.message);
  process.exit(1);
}
