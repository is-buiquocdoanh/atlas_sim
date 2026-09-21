"""Robot Atlas tự vẽ bản đồ bằng slam_toolbox (Module 8).

CHỈ chạy slam_toolbox + RViz -- KHÔNG tự spawn robot/world. Giống quy trình thực tế:
bringup (robot thật hoặc mô phỏng) là một tầng riêng chạy trước, SLAM chỉ là một ứng
dụng "tiêu thụ" /scan + /odom + TF do tầng bringup cung cấp, không quan tâm world nào
đang chạy hay robot là thật hay mô phỏng. atlas_control đã đóng vai bringup đó.

    # Terminal 1: bringup (mô phỏng)
    ros2 launch atlas_control controller.launch.py world:=maze.sdf
    # Terminal 2: SLAM
    ros2 launch atlas_slam slam.launch.py
    # Terminal 3: lái đi khắp world để quét hết các góc (xem atlas_teleop)
    ros2 run teleop_twist_keyboard teleop_twist_keyboard

Tắt RViz nếu chỉ cần chạy nền: `ros2 launch atlas_slam slam.launch.py rviz:=false`

Sau khi đi hết world, lưu bản đồ (map_frame phải đã xuất hiện trong TF, tức slam_toolbox
đã chạy được ít nhất vài giây và nhận dữ liệu /scan):

    ros2 run nav2_map_server map_saver_cli -f src/atlas_slam/maps/maze_map

Nếu muốn dùng slam_toolbox (thay vì AMCL) để ĐỊNH VỊ sau này (Module 9, xem
navigation.launch.py arg localization:=slam_toolbox), phải lưu THÊM bằng chính lệnh
serialize của slam_toolbox -- khác định dạng với map_saver_cli ở trên (.posegraph/.data,
không phải .pgm/.yaml), AMCL và slam_toolbox không dùng chung file map:

    ros2 service call /slam_toolbox/serialize_map slam_toolbox/srv/SerializePoseGraph \\
      "{filename: 'src/atlas_slam/maps/maze_map'}"
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    slam_pkg_share = get_package_share_directory("atlas_slam")
    slam_toolbox_share = get_package_share_directory("slam_toolbox")

    rviz_arg = DeclareLaunchArgument(
        "rviz",
        default_value="true",
        description="Có mở RViz xem map trực tiếp hay không",
    )

    slam_toolbox_node = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(slam_toolbox_share, "launch", "online_async_launch.py")
        ),
        launch_arguments={
            "slam_params_file": os.path.join(slam_pkg_share, "config", "mapper_params.yaml"),
            "use_sim_time": "true",
        }.items(),
    )

    rviz_node = Node(
        package="rviz2",
        executable="rviz2",
        arguments=["-d", os.path.join(slam_pkg_share, "rviz", "slam_toolbox_default.rviz")],
        parameters=[{"use_sim_time": True}],
        output="screen",
        condition=IfCondition(LaunchConfiguration("rviz")),
    )

    return LaunchDescription(
        [
            rviz_arg,
            slam_toolbox_node,
            rviz_node,
        ]
    )
