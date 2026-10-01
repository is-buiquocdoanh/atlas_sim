#!/usr/bin/env python3
"""Demo nav2_simple_commander: nhiều waypoint liên tiếp + feedback + hủy giữa chừng (Module 12).

Khác send_goal_and_time.py (Module 10, 1 goal, chỉ đợi xong) -- dùng followWaypoints() thay vì
goToPose(), đọc feedback TRONG LÚC chạy (không chỉ đợi), và minh họa cancelTask() khi nhấn
Ctrl+C. Đây là THAM KHẢO, không phải bài tập -- patrol_node.py (lặp vô hạn, tự viết trong
atlas_apps) là bài tập thật, xem docs/course/module-12-waypoint/.

    ros2 run atlas_slam waypoint_demo.py
"""

import sys

import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator

# 4 điểm cố định trong maze.sdf -- đổi lại nếu dùng world/map khác.
WAYPOINTS = [(-2.5, 0.0), (0.0, 2.0), (2.5, 0.0), (0.0, -2.0)]


def make_pose(x: float, y: float) -> PoseStamped:
    pose = PoseStamped()
    pose.header.frame_id = "map"
    pose.pose.position.x = x
    pose.pose.position.y = y
    pose.pose.orientation.w = 1.0
    return pose


def main():
    rclpy.init()
    nav = BasicNavigator()
    nav.waitUntilNav2Active()

    goal_poses = [make_pose(x, y) for x, y in WAYPOINTS]
    nav.followWaypoints(goal_poses)

    try:
        while not nav.isTaskComplete():
            feedback = nav.getFeedback()
            if feedback:
                print(f"Đang đi tới waypoint #{feedback.current_waypoint}/{len(WAYPOINTS)}")
            rclpy.spin_once(nav, timeout_sec=0.5)
        result = nav.getResult()
        print(f"Kết quả: {result}")
    except KeyboardInterrupt:
        # BasicNavigator tự có handler SIGINT riêng (của rclpy), lúc Ctrl+C có thể đã TỰ gọi
        # rclpy.shutdown() trước khi code tới được đây -- gọi shutdown() lần 2 ở finally bên
        # dưới sẽ ra lỗi "rcl_shutdown already called" nếu không kiểm tra rclpy.ok() trước.
        print("Ctrl+C -- hủy task giữa chừng...")
        nav.cancelTask()

    if rclpy.ok():
        rclpy.shutdown()


if __name__ == "__main__":
    main()
