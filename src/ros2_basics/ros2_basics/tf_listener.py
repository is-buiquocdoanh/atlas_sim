#!/usr/bin/env python3
"""Tra cứu transform "world" -> "moving_frame" định kỳ, in ra vị trí (Module 2).

Không tự subscribe /tf thủ công -- dùng tf2_ros.Buffer + TransformListener, tự lo việc
"chờ" transform tới (frame vừa xuất hiện có thể chưa có dữ liệu ngay) và tự NỘI SUY theo
thời gian nếu cần, việc mà tự viết code pub/sub tay sẽ phải làm lại từ đầu.
"""

import rclpy
from rclpy.node import Node
from tf2_ros import LookupException, TransformListener
from tf2_ros.buffer import Buffer


class TFListenerNode(Node):
    def __init__(self):
        super().__init__("tf_listener")
        self.buffer = Buffer()
        self.listener = TransformListener(self.buffer, self)
        self.create_timer(1.0, self.lookup_transform)

    def lookup_transform(self):
        try:
            t = self.buffer.lookup_transform("world", "moving_frame", rclpy.time.Time())
        except LookupException:
            self.get_logger().warn("Chưa có transform world -> moving_frame (broadcaster đã chạy chưa?)")
            return

        x, y = t.transform.translation.x, t.transform.translation.y
        self.get_logger().info(f"moving_frame đang ở ({x:.2f}, {y:.2f}) so với world")


def main(args=None):
    rclpy.init(args=args)
    node = TFListenerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
