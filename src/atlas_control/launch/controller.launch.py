"""Đưa robot Atlas vào Gazebo với ros2_control, robot di chuyển được bằng /cmd_vel (Module 5).

Tái dùng atlas_gazebo/launch/spawn_robot.launch.py nhưng override tham số `model`
bằng atlas.control.xacro (đã có <ros2_control> + plugin gz_ros2_control). Không copy
lại logic mở world/spawn/bridge để tránh 2 nơi cùng định nghĩa 1 việc.

`controller_manager spawner` tự chờ/retry cho tới khi service của controller_manager
sẵn sàng (được plugin gz_ros2_control tạo ra ngay sau khi Gazebo spawn xong entity),
nên không cần thêm delay/event handler thủ công.

    ros2 launch atlas_control controller.launch.py
    ros2 launch atlas_control controller.launch.py world:=maze.sdf

Sau khi chạy, thử:
    ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.2}, angular: {z: 0.3}}"

Muốn 1 lệnh duy nhất để "dựng" cả tầng bringup mà không cần nhớ package nào chứa gì, xem
atlas_bringup/launch/bringup.launch.py (chỉ include file này, không duplicate logic).
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    control_pkg_share = get_package_share_directory("atlas_control")
    gazebo_pkg_share = get_package_share_directory("atlas_gazebo")

    world_arg = DeclareLaunchArgument(
        "world",
        default_value="empty.sdf",
        description="Tên file world trong atlas_gazebo/worlds (vd: empty.sdf, maze.sdf)",
    )

    spawn_with_control = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(gazebo_pkg_share, "launch", "spawn_robot.launch.py")
        ),
        launch_arguments={
            "model": os.path.join(control_pkg_share, "urdf", "atlas.control.xacro"),
            "world": LaunchConfiguration("world"),
        }.items(),
    )

    joint_state_broadcaster_spawner = Node(
        package="controller_manager",
        executable="spawner",
        arguments=["joint_state_broadcaster"],
        output="screen",
    )

    diff_drive_controller_spawner = Node(
        package="controller_manager",
        executable="spawner",
        arguments=["diff_drive_controller"],
        output="screen",
    )

    return LaunchDescription(
        [
            world_arg,
            spawn_with_control,
            joint_state_broadcaster_spawner,
            diff_drive_controller_spawner,
        ]
    )
