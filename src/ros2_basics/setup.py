import os
from glob import glob

from setuptools import find_packages, setup

package_name = "ros2_basics"

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
    description="Module 1 (khóa học Atlas Sim): node, publisher/subscriber, service, parameter, launch file.",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "sensor_publisher = ros2_basics.sensor_publisher:main",
            "data_logger = ros2_basics.data_logger:main",
            "stats_client = ros2_basics.stats_client:main",
            "add_two_ints_server = ros2_basics.add_two_ints_server:main",
            "add_two_ints_client = ros2_basics.add_two_ints_client:main",
        ],
    },
)
