"""Xem robot Atlas trong RViz, không cần Gazebo.

Dùng cho Module 3 (URDF/XACRO): kiểm tra URDF hợp lệ, TF tree đúng, joint xoay được
qua joint_state_publisher_gui, trước khi đưa robot vào mô phỏng vật lý (Module 4).

    ros2 launch atlas_description display.launch.py
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.conditions import IfCondition
from launch.substitutions import Command, LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    pkg_share = get_package_share_directory("atlas_description")
    default_xacro_path = os.path.join(pkg_share, "urdf", "atlas.urdf.xacro")
    default_rviz_path = os.path.join(pkg_share, "rviz", "atlas_view.rviz")

    model_arg = DeclareLaunchArgument(
        "model",
        default_value=default_xacro_path,
        description="Đường dẫn tới file URDF/XACRO của robot Atlas",
    )
    use_gui_arg = DeclareLaunchArgument(
        "use_joint_state_gui",
        default_value="true",
        description="Bật joint_state_publisher_gui để tự xoay bánh xe bằng slider",
    )

    robot_description = ParameterValue(
        Command(["xacro ", LaunchConfiguration("model")]), value_type=str
    )

    robot_state_publisher_node = Node(
        package="robot_state_publisher",
        executable="robot_state_publisher",
        output="screen",
        parameters=[{"robot_description": robot_description}],
    )

    joint_state_publisher_gui_node = Node(
        package="joint_state_publisher_gui",
        executable="joint_state_publisher_gui",
        condition=IfCondition(LaunchConfiguration("use_joint_state_gui")),
    )

    rviz_node = Node(
        package="rviz2",
        executable="rviz2",
        arguments=["-d", default_rviz_path],
        output="screen",
    )

    return LaunchDescription(
        [
            model_arg,
            use_gui_arg,
            robot_state_publisher_node,
            joint_state_publisher_gui_node,
            rviz_node,
        ]
    )
