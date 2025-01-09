import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const venvPath = path.join(process.cwd(), 'venv');
const iconPath = path.join(process.cwd(), 'bluetooth-media-controller.png');
const appName = 'bluetooth-media-controller';
const appVersion = '1.0.0';

// Create MIT License
const mitLicense = `MIT License

Copyright (c) ${new Date().getFullYear()} Chetan Mohite

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

// Write LICENSE file
fs.writeFileSync('LICENSE', mitLicense);

// Check if icon exists
if (!fs.existsSync(iconPath)) {
  console.error("Error: bluetooth-media-controller.png not found in the current directory.");
  process.exit(1);
}

console.log('Creating Debian package structure...');
const debianDir = `${appName}-${appVersion}`;
execSync(`mkdir -p ${debianDir}/DEBIAN ${debianDir}/usr/bin ${debianDir}/usr/share/applications ${debianDir}/usr/share/icons ${debianDir}/usr/share/doc/${appName}`);

// Copy LICENSE to doc directory
execSync(`cp LICENSE ${debianDir}/usr/share/doc/${appName}/copyright`);

const controlFile = `Package: bluetooth-media-controller
Version: 1.0.0
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, python3 (>= 3.8), python3-gi, python3-gi-cairo, gir1.2-gtk-3.0, libc6 (>= 2.31), 
 libcanberra-gtk-module | libcanberra-gtk3-module, bluez (>= 5.50)
Maintainer: Chetan Mohite <chetanmohite2128@gmail.com>
Description: Bluetooth Media Controller
 A GTK application to control Bluetooth media playback.
 .
 This package includes:
  * Media playback controls
  * Album art display
  * Shuffle and repeat functionality
  * Progress tracking
Homepage: https://github.com/yourusername/bluetooth-media-controller
`;

fs.writeFileSync(`${debianDir}/DEBIAN/control`, controlFile);

// Updated postinst script that doesn't modify system configurations
const postinstScript = `#!/bin/bash
set -e

# Set correct permissions for application files
chmod 755 /usr/bin/bluetooth-media-controller
chmod 644 /usr/share/icons/bluetooth-media-controller.png
chmod 644 /usr/share/applications/bluetooth-media-controller.desktop
chmod 644 /usr/share/doc/bluetooth-media-controller/copyright

# Update desktop database without modifying system configs
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

exit 0
`;

fs.writeFileSync(`${debianDir}/DEBIAN/postinst`, postinstScript);
execSync(`chmod 755 ${debianDir}/DEBIAN/postinst`);

// Create prerm script to handle clean uninstallation
const prermScript = `#!/bin/bash
set -e

# Clean up only package-specific files
if [ -f /usr/share/applications/bluetooth-media-controller.desktop ]; then
    rm -f /usr/share/applications/bluetooth-media-controller.desktop
fi

exit 0
`;

fs.writeFileSync(`${debianDir}/DEBIAN/prerm`, prermScript);
execSync(`chmod 755 ${debianDir}/DEBIAN/prerm`);

console.log('Installing system dependencies...');
try {
  execSync('sudo apt install -y python3-dev python3-gi python3-gi-cairo gir1.2-gtk-3.0 libgirepository1.0-dev gcc libcairo2-dev pkg-config python3-dev gir1.2-gtk-3.0 libglib2.0-dev libcanberra-gtk-module');
} catch (error) {
  console.error('Failed to install system dependencies. Please run the following command manually:');
  console.error('sudo apt install -y python3-dev python3-gi python3-gi-cairo gir1.2-gtk-3.0 libgirepository1.0-dev gcc libcairo2-dev pkg-config python3-dev gir1.2-gtk-3.0 libglib2.0-dev libcanberra-gtk-module');
  process.exit(1);
}

console.log('Creating virtual environment...');
execSync(`python3 -m venv ${venvPath}`);

const pythonPath = path.join(venvPath, 'bin', 'python');
const pipPath = path.join(venvPath, 'bin', 'pip');

console.log('Upgrading pip and installing wheel...');
execSync(`${pipPath} install --upgrade pip wheel`);

console.log('Installing PyInstaller and dependencies...');
execSync(`${pipPath} install pyinstaller PyGObject requests`);

console.log('Creating PyInstaller spec file...');
const specFile = `
# -*- mode: python -*-
import sys
import os
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

hiddenimports = collect_submodules('gi') + ['requests']

a = Analysis(['${appName}.py'],
             binaries=[],
             datas=[('${iconPath}', '.')],
             hiddenimports=hiddenimports,
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)

pyz = PYZ(a.pure, a.zipped_data,
          cipher=block_cipher)

exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='${appName}',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          runtime_tmpdir=None,
          console=False)
`;

fs.writeFileSync(`${appName}.spec`, specFile);

console.log('Creating .desktop file...');
const desktopFile = `[Desktop Entry]
Version=1.0
Type=Application
Name=Bluetooth Media Controller
Comment=Control Bluetooth media playback
Exec=/usr/bin/${appName}
Icon=/usr/share/icons/${appName}.png
Terminal=false
Categories=AudioVideo;Audio;Player;GTK;
`;

fs.writeFileSync(`${appName}.desktop`, desktopFile);

console.log('Building application...');
try {
  execSync(`${pythonPath} -m PyInstaller --clean ${appName}.spec`, { stdio: 'inherit' });
} catch (error) {
  console.error('Error during PyInstaller build:', error);
  process.exit(1);
}

console.log('Copying files to Debian package structure...');
execSync(`cp dist/${appName} ${debianDir}/usr/bin/`);
execSync(`cp ${appName}.desktop ${debianDir}/usr/share/applications/`);
execSync(`mkdir -p ${debianDir}/usr/share/icons`);
execSync(`cp ${iconPath} ${debianDir}/usr/share/icons/${appName}.png`);

console.log('Building Debian package...');
execSync(`dpkg-deb --build ${debianDir}`);

console.log('Setting correct permissions for the .deb package...');
execSync(`chmod 644 ${debianDir}.deb`);
execSync(`sudo chown root:root ${debianDir}.deb`);

// console.log('Cleaning up build files...');
// execSync(`rm -rf build dist ${appName}.spec ${debianDir} venv`);

console.log(`
Build complete! The .deb package has been created with the following improvements:

1. Added MIT License (check LICENSE file)
2. Added minimum bluez version requirement (>= 5.50)
3. Improved package documentation
4. Clean installation/uninstallation process
5. No system configuration modifications
6. Correct permissions set on the .deb file

To install on the target system:
1. Ensure bluez >= 5.50 is installed:
   sudo apt-get install bluez

2. Install the package:
   sudo dpkg -i ${appName}-${appVersion}.deb

3. If there are dependency issues:
   sudo apt-get install -f

The application should now be available in your applications menu.
`);