import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const venvPath = path.join(process.cwd(), 'venv');
const iconPath = path.join(process.cwd(), 'bluetooth-media-controller.png');
const appName = 'bluetooth-media-controller';
const appVersion = '1.0.0';

// Check if icon exists
if (!fs.existsSync(iconPath)) {
  console.error("Error: bluetooth-media-controller.png not found in the current directory.");
  process.exit(1);
}

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
          console=False,
          icon='${iconPath}')
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
execSync(`${pythonPath} -m PyInstaller --clean ${appName}.spec`);

console.log('Creating Debian package structure...');
const debianDir = `${appName}-${appVersion}`;
execSync(`mkdir -p ${debianDir}/DEBIAN ${debianDir}/usr/bin ${debianDir}/usr/share/applications ${debianDir}/usr/share/icons`);

const controlFile = `Package: ${appName}
Version: ${appVersion}
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libcanberra-gtk-module
Maintainer: Your Name <your.email@example.com>
Description: Bluetooth Media Controller
 A GTK application to control Bluetooth media playback.
`;

fs.writeFileSync(`${debianDir}/DEBIAN/control`, controlFile);

console.log('Copying files to Debian package structure...');
execSync(`cp dist/${appName} ${debianDir}/usr/bin/`);
execSync(`cp ${appName}.desktop ${debianDir}/usr/share/applications/`);
execSync(`cp ${iconPath} ${debianDir}/usr/share/icons/${appName}.png`);

console.log('Building Debian package...');
execSync(`dpkg-deb --build ${debianDir}`);

console.log('Build complete! The .deb package is ready for installation.');
console.log(`To install the package, run: sudo dpkg -i ${appName}-${appVersion}.deb`);
console.log('After installation, you may need to run: sudo apt-get install -f');