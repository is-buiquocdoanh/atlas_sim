#!/usr/bin/env python3
"""Node vừa SUBSCRIBE dữ liệu cảm biến liên tục, vừa cung cấp SERVICE trả lời theo yêu cầu.

Đây là 2 mô hình giao tiếp khác hẳn nhau, cố tình đặt chung 1 node để thấy rõ khi nào dùng
cái nào:
- Subscriber (on_sensor_data): BỊ ĐỘNG, chạy callback mỗi khi có message mới, không biết
  trước khi nào có dữ liệu -- hợp cho luồng dữ liệu liên tục (cảm biến, trạng thái robot).
- Service (on_get_stats): CHỦ ĐỘNG theo yêu cầu, client hỏi thì mới trả lời 1 lần, giống
  gọi hàm từ xa (remote procedure call) -- hợp cho việc "hỏi 1 thông tin ngay bây giờ"
  hoặc "yêu cầu làm 1 việc rồi báo kết quả", không hợp cho dữ liệu liên tục (không có ai
  gọi liên tục 10 lần/giây để "poll" cả).
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64
from std_srvs.srv import Trigger


class DataLogger(Node):
    def __init__(self):
        super().__init__("data_logger")

        self.message_count = 0
        self.latest_value = None

        # Subscriber: (kiểu message, tên topic, callback, queue size). Tên topic PHẢI khớp
        # đúng "sensor_data" mà sensor_publisher.py publish -- ROS 2 khớp node với nhau
        # bằng TÊN TOPIC + KIỂU MESSAGE, không quan tâm node nào viết trước/sau, chạy trên
        # máy nào (miễn cùng ROS_DOMAIN_ID).
        self.subscription = self.create_subscription(
            Float64, "sensor_data", self.on_sensor_data, 10
        )

        # Service: dùng std_srvs/Trigger có sẵn (request rỗng, response gồm success + message)
        # thay vì tự định nghĩa .srv riêng -- đủ cho nhu cầu ở Module 1, không cần học cách
        # viết custom interface (nằm ngoài phạm vi module này).
        self.service = self.create_service(Trigger, "get_stats", self.on_get_stats)

        self.get_logger().info("data_logger sẵn sàng: đang nghe 'sensor_data', chờ gọi 'get_stats'")

    def on_sensor_data(self, msg: Float64):
        self.message_count += 1
        self.latest_value = msg.data
        self.get_logger().info(f"Nhận #{self.message_count}: {msg.data:.2f}")

    def on_get_stats(self, request: Trigger.Request, response: Trigger.Response):
        # Callback service PHẢI trả về đúng object `response` đã nhận (điền field rồi trả
        # lại), khác callback subscriber không trả về gì cả.
        if self.latest_value is None:
            response.success = False
            response.message = "Chưa nhận được message nào."
        else:
            response.success = True
            response.message = (
                f"Đã nhận {self.message_count} message, giá trị mới nhất: {self.latest_value:.2f}"
            )
        return response


def main(args=None):
    rclpy.init(args=args)
    node = DataLogger()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
