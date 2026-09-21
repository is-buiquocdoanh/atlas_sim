#!/usr/bin/env python3
"""Client gọi 'add_two_ints' với 2 số truyền qua command-line, in kết quả rồi thoát.

    ros2 run ros2_basics add_two_ints_client 3 5
"""

import sys

import rclpy
from example_interfaces.srv import AddTwoInts
from rclpy.node import Node


class AddTwoIntsClient(Node):
    def __init__(self):
        super().__init__("add_two_ints_client")
        self.client = self.create_client(AddTwoInts, "add_two_ints")

    def call(self, a: int, b: int):
        if not self.client.wait_for_service(timeout_sec=3.0):
            self.get_logger().error("Không thấy service 'add_two_ints' -- server đã chạy chưa?")
            sys.exit(1)

        request = AddTwoInts.Request()
        request.a = a
        request.b = b
        future = self.client.call_async(request)
        rclpy.spin_until_future_complete(self, future)

        response = future.result()
        self.get_logger().info(f"{a} + {b} = {response.sum}")


def main(args=None):
    if len(sys.argv) != 3:
        print("Cách dùng: ros2 run ros2_basics add_two_ints_client <a> <b>")
        sys.exit(1)
    a, b = int(sys.argv[1]), int(sys.argv[2])

    rclpy.init(args=args)
    node = AddTwoIntsClient()
    node.call(a, b)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
