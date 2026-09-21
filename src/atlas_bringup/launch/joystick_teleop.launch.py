"""Điều khiển Atlas bằng joystick/gamepad, qua twist_mux.

    Terminal 1 (bringup, xem atlas_control):
        ros2 launch atlas_control controller.launch.py world:=maze.sdf
    Terminal 2:
        ros2 launch atlas_bringup joystick_teleop.launch.py

joy_node đọc gamepad -> /joy
teleop_node (teleop_twist_joy) đọc /joy -> Twist trên cmd_vel_joy
twist_mux gộp cmd_vel_mag/cmd_vel_nav/cmd_vel_joy/cmd_vel_collision theo priority -> /cmd_vel
(đầu vào thật của atlas_control/diff_drive_controller)

Kiểm tra gamepad đã được máy nhận trước khi chạy:
    ros2 run joy joy_enumerate_devices

Cảnh báo: một khi twist_mux đang publish /cmd_vel, KHÔNG chạy đồng thời
`ros2 run teleop_twist_keyboard teleop_twist_keyboard` (Module 7) -- node đó publish
thẳng vào /cmd_vel, giẫm chân lên twist_mux thay vì đi qua cơ chế ưu tiên.
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    pkg_share = get_package_share_directory("atlas_bringup")
    config = os.path.join(pkg_share, "config", "joystick_teleop.yaml")

    joy_node = Node(
        package="joy",
        executable="joy_node",
        name="joy_node",
        parameters=[config],
        output="screen",
    )

    teleop_node = Node(
        package="teleop_twist_joy",
        executable="teleop_node",
        name="teleop_node",
        parameters=[config],
        remappings=[("cmd_vel", "cmd_vel_joy")],
        output="screen",
    )

    twist_mux_node = Node(
        package="twist_mux",
        executable="twist_mux",
        name="twist_mux",
        parameters=[config, {"use_sim_time": True}],
        remappings=[("/cmd_vel_out", "/cmd_vel")],
        output="screen",
    )

    return LaunchDescription([joy_node, teleop_node, twist_mux_node])
