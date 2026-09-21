"""Dựng 1 cây TF nhỏ: world -> static_frame (tĩnh) + world -> moving_frame (động) (Module 2).

    ros2 launch ros2_basics demo_tf.launch.py

Sau khi chạy, xem cây TF:
    ros2 run tf2_tools view_frames          # xuất frames_<timestamp>.pdf
    ros2 run tf2_ros tf2_echo world moving_frame
"""

from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    static_tf_node = Node(
        package="tf2_ros",
        executable="static_transform_publisher",
        name="static_frame_publisher",
        arguments=["--x", "1.0", "--y", "0.0", "--z", "0.5", "--frame-id", "world", "--child-frame-id", "static_frame"],
    )

    dynamic_tf_node = Node(
        package="ros2_basics",
        executable="tf_broadcaster",
        name="tf_broadcaster",
        output="screen",
    )

    return LaunchDescription([static_tf_node, dynamic_tf_node])
