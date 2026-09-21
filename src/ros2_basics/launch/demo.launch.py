"""Chạy sensor_publisher + data_logger cùng lúc, 1 lệnh duy nhất (Module 1).

    ros2 launch ros2_basics demo.launch.py
    ros2 launch ros2_basics demo.launch.py publish_rate_hz:=5.0

Không launch stats_client ở đây -- client "gọi 1 lần rồi thoát" không hợp để chạy cùng 2
node kia (launch file mong các process chạy MÃI, không phải chạy xong rồi tự tắt). Gọi
service sau khi 2 node trên đã chạy, ở 1 terminal khác:
    ros2 run ros2_basics stats_client
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    publish_rate_arg = DeclareLaunchArgument(
        "publish_rate_hz",
        default_value="1.0",
        description="Tần số publish của sensor_publisher (Hz)",
    )

    sensor_publisher_node = Node(
        package="ros2_basics",
        executable="sensor_publisher",
        name="sensor_publisher",
        output="screen",
        # Tham số truyền lúc launch GHI ĐÈ giá trị mặc định trong declare_parameter() của
        # node -- đây là cách chuẩn để 1 node dùng được ở nhiều ngữ cảnh khác nhau (module
        # 1 test nhanh, sau này ghép vào hệ thống lớn) mà không cần sửa code.
        parameters=[{"publish_rate_hz": LaunchConfiguration("publish_rate_hz")}],
    )

    data_logger_node = Node(
        package="ros2_basics",
        executable="data_logger",
        name="data_logger",
        output="screen",
    )

    return LaunchDescription(
        [
            publish_rate_arg,
            sensor_publisher_node,
            data_logger_node,
        ]
    )
