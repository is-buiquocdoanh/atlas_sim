"""Điểm khởi chạy DUY NHẤT cho tầng mô phỏng (world + spawn robot + ros2_control).

Không viết lại logic -- chỉ include atlas_control/launch/controller.launch.py (đã có sẵn
world + spawn robot + gz_ros2_control + spawner). Lý do có thêm file này dù đã có
controller.launch.py: gom về đúng 1 package (atlas_bringup) làm điểm vào chính cho toàn bộ
stack, để không phải nhớ "muốn chạy mô phỏng thì vào package atlas_control" -- các package
ứng dụng phía trên (atlas_slam, các launch khác của atlas_bringup) đều có thể trỏ vào đây thay
vì atlas_control trực tiếp. `atlas_control/launch/controller.launch.py` vẫn giữ nguyên,
dùng độc lập được như trước (vd khi chỉ làm việc trong phạm vi package đó).

    ros2 launch atlas_bringup bringup.launch.py
    ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    control_pkg_share = get_package_share_directory("atlas_control")

    world_arg = DeclareLaunchArgument(
        "world",
        default_value="empty.sdf",
        description="Tên file world trong atlas_gazebo/worlds (vd: empty.sdf, maze.sdf)",
    )

    simulation_bringup = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(control_pkg_share, "launch", "controller.launch.py")
        ),
        launch_arguments={"world": LaunchConfiguration("world")}.items(),
    )

    return LaunchDescription([world_arg, simulation_bringup])
