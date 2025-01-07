
# -*- mode: python -*-
import sys
import os
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

hiddenimports = collect_submodules('gi') + ['requests']

a = Analysis(['bluetooth-media-controller.py'],
             binaries=[],
             datas=[('/home/am-pc-07/Documents/bluetooth-media-controller/bluetooth-media-controller.png', '.')],
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
          name='bluetooth-media-controller',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          runtime_tmpdir=None,
          console=False,
          icon='/home/am-pc-07/Documents/bluetooth-media-controller/bluetooth-media-controller.png')
