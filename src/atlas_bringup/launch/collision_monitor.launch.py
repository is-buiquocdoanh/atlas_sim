"""Lớp an toàn collision_monitor: quét /scan quanh robot, tự động giảm tốc/dừng khi sắp
va chạm -- độc lập với Nav2 (hoạt động cả khi chỉ lái bằng joystick/bàn phím).

Yêu cầu twist_mux đang chạy (atlas_bringup/joystick_teleop.launch.py) để lớp an toàn này
có tác dụng thật -- nếu không có twist_mux, publish vào /cmd_vel_collision không ai lắng
nghe cả. Chạy CÙNG LÚC với joystick_teleop.launch.py hoặc bất kỳ launch nào đã có twist_mux:

    # Terminal 1: bringup mô phỏng
    ros2 launch atlas_control controller.launch.py world:=maze.sdf
    # Terminal 2: joystick + twist_mux
    ros2 launch atlas_bringup joystick_teleop.launch.py
    # Terminal 3: lớp an toàn
    ros2 launch atlas_bringup collision_monitor.launch.py

Test nhanh không cần joystick thật: đặt vật cản trong Gazebo trước robot, publish thử
/cmd_vel_nav hoặc /cmd_vel_joy (bất kỳ nguồn nào twist_mux đang mux) và quan sát robot tự
dừng/giảm tốc khi lại gần, bất kể lệnh gốc là gì.
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    pkg_share = get_package_share_directory("atlas_bringup")
    config = os.path.join(pkg_share, "config", "collision_monitor.yaml")

    collision_monitor_node = Node(
        package="nav2_collision_monitor",
        executable="collision_monitor",
        name="collision_monitor",
        output="screen",
        parameters=[config],
    )

    lifecycle_manager_node = Node(
        package="nav2_lifecycle_manager",
        executable="lifecycle_manager",
        name="lifecycle_manager_collision_monitor",
        output="screen",
        parameters=[
            {
                "use_sim_time": True,
                "autostart": True,
                "node_names": ["collision_monitor"],
            }
        ],
    )

    relay_node = Node(
        package="atlas_bringup",
        executable="collision_guard_relay.py",
        name="collision_guard_relay",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    return LaunchDescription([collision_monitor_node, lifecycle_manager_node, relay_node])
