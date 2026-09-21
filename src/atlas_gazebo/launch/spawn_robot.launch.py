"""Đưa robot Atlas vào Gazebo Fortress (Module 4).

Mở world, publish /robot_description (bản có tag <gazebo> vật lý), spawn robot,
và bridge /clock để mọi node ROS 2 dùng đúng thời gian mô phỏng.

Robot chưa di chuyển được ở bước này (chưa có ros2_control/diff_drive_controller,
việc đó thuộc atlas_control - Module 5). Mục tiêu ở đây chỉ là: robot đứng vững,
không rung/lật, va chạm với world đúng như vật lý thật.

    ros2 launch atlas_gazebo spawn_robot.launch.py
    ros2 launch atlas_gazebo spawn_robot.launch.py world:=maze.sdf
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import Command, LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    gazebo_pkg_share = get_package_share_directory("atlas_gazebo")
    ros_gz_sim_share = get_package_share_directory("ros_gz_sim")

    world_arg = DeclareLaunchArgument(
        "world",
        default_value="empty.sdf",
        description="Tên file world trong atlas_gazebo/worlds (vd: empty.sdf, maze.sdf)",
    )
    model_arg = DeclareLaunchArgument(
        "model",
        default_value=os.path.join(gazebo_pkg_share, "urdf", "atlas.gazebo.xacro"),
        description=(
            "Đường dẫn file xacro dùng để spawn robot. Package khác (vd atlas_control) "
            "có thể override bằng bản xacro của mình (đã include file này + thêm phần riêng)."
        ),
    )
    x_arg = DeclareLaunchArgument("x", default_value="0.0", description="Vị trí spawn theo x (m)")
    y_arg = DeclareLaunchArgument("y", default_value="0.0", description="Vị trí spawn theo y (m)")
    yaw_arg = DeclareLaunchArgument(
        "yaw", default_value="0.0", description="Hướng spawn quanh trục z (rad)"
    )

    world_path = PathJoinSubstitution([gazebo_pkg_share, "worlds", LaunchConfiguration("world")])

    gz_sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(ros_gz_sim_share, "launch", "gz_sim.launch.py")
        ),
        launch_arguments={"gz_args": [world_path, " -r"]}.items(),
    )

    robot_description = ParameterValue(
        Command(["xacro ", LaunchConfiguration("model")]),
        value_type=str,
    )

    robot_state_publisher_node = Node(
        package="robot_state_publisher",
        executable="robot_state_publisher",
        output="screen",
        parameters=[{"robot_description": robot_description, "use_sim_time": True}],
    )

    spawn_robot_node = Node(
        package="ros_gz_sim",
        executable="create",
        arguments=[
            "-topic", "robot_description",
            "-name", "atlas",
            "-x", LaunchConfiguration("x"),
            "-y", LaunchConfiguration("y"),
            "-z", "0.05",
            "-Y", LaunchConfiguration("yaw"),
        ],
        output="screen",
    )

    gz_bridge_node = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        arguments=[
            "--ros-args",
            "-p",
            f"config_file:={os.path.join(gazebo_pkg_share, 'config', 'gz_bridge.yaml')}",
        ],
        parameters=[{"use_sim_time": True}],
        output="screen",
    )

    return LaunchDescription(
        [
            world_arg,
            model_arg,
            x_arg,
            y_arg,
            yaw_arg,
            gz_sim,
            robot_state_publisher_node,
            spawn_robot_node,
            gz_bridge_node,
        ]
    )
