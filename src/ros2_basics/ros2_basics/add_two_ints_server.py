#!/usr/bin/env python3
"""Server TÍNH TOÁN thật (cộng 2 số) -- ví dụ trực quan nhất cho Service.

Khác data_logger.py (dùng std_srvs/Trigger, request RỖNG, chỉ "báo cáo" dữ liệu đã có sẵn),
service ở đây nhận request CÓ DỮ LIỆU (2 số a, b) và trả về kết quả TÍNH RA từ chính request
đó -- đúng bản chất "gọi hàm từ xa" của service: đưa input, nhận output tương ứng.
"""

import rclpy
from example_interfaces.srv import AddTwoInts
from rclpy.node import Node


class AddTwoIntsServer(Node):
    def __init__(self):
        super().__init__("add_two_ints_server")
        self.service = self.create_service(AddTwoInts, "add_two_ints", self.on_add_two_ints)
        self.get_logger().info("add_two_ints_server sẵn sàng, chờ gọi 'add_two_ints'")

    def on_add_two_ints(self, request: AddTwoInts.Request, response: AddTwoInts.Response):
        response.sum = request.a + request.b
        self.get_logger().info(f"Nhận a={request.a}, b={request.b} -> trả về sum={response.sum}")
        return response


def main(args=None):
    rclpy.init(args=args)
    node = AddTwoIntsServer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
