import os
from glob import glob

from setuptools import find_packages, setup

package_name = "atlas_apps"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.launch.py")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="doanh",
    maintainer_email="roboticsvn.ai@gmail.com",
    description="Node ứng dụng do học viên tự viết (Module 12 trở đi).",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            # Tự thêm dòng ở đây khi viết node mới, theo đúng mẫu:
            #   "ten_lenh = atlas_apps.ten_file:main"
            # Xem lại docs/course/module-01-ros2-core-concepts/07-cau-truc-package.md nếu quên
            # vì sao thiếu dòng này thì `ros2 run` không tìm thấy executable.
        ],
    },
)
