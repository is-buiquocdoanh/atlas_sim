#!/usr/bin/env python3
"""Publish 1 transform ĐỘNG "world" -> "moving_frame", tự xoay tròn quanh gốc (Module 2).

TF cũng chỉ là topic /tf (tf2_msgs/msg/TFMessage) publish qua tf2_ros.TransformBroadcaster --
không có cơ chế đặc biệt nào khác pub/sub đã học ở Module 1, chỉ là 1 lớp tiện ích quản lý
CÂY quan hệ giữa các frame thay vì phải tự publish/subscribe thủ công.

Không dùng tf_transformations (lỗi tương thích numpy trên nhiều máy) -- tự tính quaternion
từ góc yaw bằng math.sin/cos, đủ dùng cho xoay quanh trục Z (2D, đúng trường hợp robot
diff-drive di chuyển trên mặt phẳng).
"""

import math

import rclpy
from geometry_msgs.msg import TransformStamped
from rclpy.node import Node
from tf2_ros import TransformBroadcaster


class TFBroadcasterNode(Node):
    def __init__(self):
        super().__init__("tf_broadcaster")
        self.broadcaster = TransformBroadcaster(self)
        self.radius = 1.0
        self.angular_speed = 0.5  # rad/s
        self.t0 = self.get_clock().now()
        self.create_timer(0.05, self.broadcast_transform)  # 20 Hz -- đủ mượt để xem trong RViz

    def broadcast_transform(self):
        elapsed = (self.get_clock().now() - self.t0).nanoseconds / 1e9
        angle = self.angular_speed * elapsed

        t = TransformStamped()
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = "world"          # frame CHA
        t.child_frame_id = "moving_frame"    # frame CON -- vị trí/hướng tính TƯƠNG ĐỐI so với cha

        t.transform.translation.x = self.radius * math.cos(angle)
        t.transform.translation.y = self.radius * math.sin(angle)
        t.transform.translation.z = 0.0

        # Quaternion cho góc xoay quanh trục Z (yaw) -- công thức chuẩn, không cần thư viện ngoài.
        t.transform.rotation.z = math.sin(angle / 2.0)
        t.transform.rotation.w = math.cos(angle / 2.0)

        self.broadcaster.sendTransform(t)


def main(args=None):
    rclpy.init(args=args)
    node = TFBroadcasterNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
