from setuptools import setup

setup(
    name="bluetooth-media-controller",
    version="1.0.0",
    packages=[""],
    install_requires=[
        "requests",
    ],
    entry_points={
        "console_scripts": [
            "bluetooth-media-controller=bluetooth_media_controller:main",
        ],
    },
)