#!/usr/bin/env python3
"""Client gọi service "get_stats" của data_logger.py MỘT LẦN rồi thoát.

Khác hẳn publisher/subscriber (chạy mãi, spin() vô hạn) -- client gọi service thường chỉ
cần request-nhận response-thoát, không cần giữ node sống liên tục. Đây là ví dụ đơn giản
nhất; cách gọi tương đương qua CLI, không cần viết code:
    ros2 service call /get_stats std_srvs/srv/Trigger {}
"""

import sys

import rclpy
from rclpy.node import Node
from std_srvs.srv import Trigger


class StatsClient(Node):
    def __init__(self):
        super().__init__("stats_client")
        self.client = self.create_client(Trigger, "get_stats")

    def call_get_stats(self):
        # wait_for_service: chờ tới khi server (data_logger) đã lên và quảng bá service --
        # gọi service khi server chưa sẵn sàng sẽ bị treo/lỗi, không tự động chờ như topic.
        if not self.client.wait_for_service(timeout_sec=3.0):
            self.get_logger().error("Không thấy service 'get_stats' -- data_logger đã chạy chưa?")
            sys.exit(1)

        request = Trigger.Request()
        # call_async trả về 1 Future (kết quả sẽ có SAU, không phải ngay lập tức) -- phải
        # tự spin_until_future_complete để "chờ" future đó xong, khác gọi hàm Python thường.
        future = self.client.call_async(request)
        rclpy.spin_until_future_complete(self, future)

        response = future.result()
        self.get_logger().info(f"Kết quả: success={response.success}, message='{response.message}'")


def main(args=None):
    rclpy.init(args=args)
    node = StatsClient()
    node.call_get_stats()
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
