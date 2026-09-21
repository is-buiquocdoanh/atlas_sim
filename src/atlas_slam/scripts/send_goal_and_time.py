#!/usr/bin/env python3
"""Gửi 1 goal NavigateToPose, đo thời gian + kết quả -- dùng để so sánh controller (Module 10).

Vì mỗi lần chỉ 1 controller được load (chọn qua controller:=dwb|rpp|mppi lúc launch, xem
atlas_slam/launch/navigation.launch.py), so sánh thực hiện bằng cách CHẠY LẠI launch với
controller khác nhau rồi chạy lại script này với CÙNG tọa độ goal, ghi lại số liệu mỗi lần:

    ros2 launch atlas_slam navigation.launch.py controller:=dwb
    # (terminal khác, đợi Nav2 sẵn sàng + đặt 2D Pose Estimate trong RViz trước)
    ros2 run atlas_slam send_goal_and_time.py --goal_x -1.5 --goal_y 1.8

    # Ctrl+C, đổi controller, lặp lại:
    ros2 launch atlas_slam navigation.launch.py controller:=rpp
    ros2 run atlas_slam send_goal_and_time.py --goal_x -1.5 --goal_y 1.8

    ros2 launch atlas_slam navigation.launch.py controller:=mppi
    ros2 run atlas_slam send_goal_and_time.py --goal_x -1.5 --goal_y 1.8
"""

import argparse
import time

import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--goal_x", type=float, required=True)
    ap.add_argument("--goal_y", type=float, required=True)
    args = ap.parse_args()

    rclpy.init()
    nav = BasicNavigator()
    nav.waitUntilNav2Active()

    goal = PoseStamped()
    goal.header.frame_id = "map"
    goal.pose.position.x = args.goal_x
    goal.pose.position.y = args.goal_y
    goal.pose.orientation.w = 1.0

    print(f"Gửi goal ({args.goal_x}, {args.goal_y})...")
    t0 = time.time()
    nav.goToPose(goal)
    while not nav.isTaskComplete():
        rclpy.spin_once(nav, timeout_sec=0.2)
    elapsed = time.time() - t0

    result = nav.getResult()
    print(f"Kết quả: {result}")
    print(f"Thời gian: {elapsed:.2f}s")

    rclpy.shutdown()


if __name__ == "__main__":
    main()
