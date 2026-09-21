"""Xem trực quan robot Atlas khi lái bằng bàn phím (Module 7).

Mở RViz với robot model + TF + LaserScan (/scan) + Odometry (/odom) hiển thị cùng lúc.
KHÔNG mở Gazebo và KHÔNG tự chạy teleop_twist_keyboard trong launch này -- node đó đọc
phím trực tiếp từ bàn phím (terminal raw mode), mà `ros2 launch` không đảm bảo forward
stdin của terminal cho tiến trình con (đây là hạn chế đã biết của launch, không phải lỗi
riêng của atlas_teleop). Cách chạy đủ 3 terminal:

    # Terminal 1: mô phỏng
    ros2 launch atlas_control controller.launch.py world:=maze.sdf
    # Terminal 2: RViz xem robot + scan + odom
    ros2 launch atlas_teleop teleop_keyboard.launch.py
    # Terminal 3: lái bằng bàn phím
    ros2 run teleop_twist_keyboard teleop_twist_keyboard
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    pkg_share = get_package_share_directory("atlas_teleop")
    rviz_config = os.path.join(pkg_share, "rviz", "atlas_teleop.rviz")

    rviz_node = Node(
        package="rviz2",
        executable="rviz2",
        arguments=["-d", rviz_config],
        parameters=[{"use_sim_time": True}],
        output="screen",
    )

    return LaunchDescription([rviz_node])
