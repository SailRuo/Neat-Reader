import PyInstaller.__main__
import os
import platform

def bundle_backend():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 获取系统架构作为 Tauri sidecar 的后缀
    machine = platform.machine().lower()
    if machine == 'amd64' or machine == 'x86_64':
        target = 'x86_64-pc-windows-msvc'
    elif machine == 'arm64':
        target = 'aarch64-pc-windows-msvc'
    else:
        target = 'i686-pc-windows-msvc'
    
    dist_path = os.path.join(base_dir, '..', 'frontend', 'src-tauri', 'binaries')
    if not os.path.exists(dist_path):
        os.makedirs(dist_path)

    binary_name = f'backend-{target}'
    
    PyInstaller.__main__.run([
        os.path.join(base_dir, 'main.py'),
        '--onefile',
        '--noconsole',
        '--name', binary_name,
        '--distpath', dist_path,
        '--clean',
        '--add-data', f"{os.path.join(base_dir, 'app')};app",  # 包含 app 目录
        '--hidden-import', 'uvicorn.logging',
        '--hidden-import', 'uvicorn.loops',
        '--hidden-import', 'uvicorn.loops.auto',
        '--hidden-import', 'uvicorn.protocols',
        '--hidden-import', 'uvicorn.protocols.http',
        '--hidden-import', 'uvicorn.protocols.http.auto',
        '--hidden-import', 'uvicorn.protocols.websockets',
        '--hidden-import', 'uvicorn.protocols.websockets.auto',
        '--hidden-import', 'uvicorn.lifespan',
        '--hidden-import', 'uvicorn.lifespan.on',
    ])

if __name__ == '__main__':
    bundle_backend()
