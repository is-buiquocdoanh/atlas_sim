#!/usr/bin/env python3
"""Node giả lập 1 cảm biến nhiệt độ, publish giá trị đọc được định kỳ.

Không có cảm biến thật nào ở đây -- giá trị chỉ là nhiệt độ nền (base_temperature) cộng
nhiễu ngẫu nhiên nhỏ, đủ để tạo dữ liệu "giống thật" cho các node khác xử lý. Đây chính là
kỹ thuật thường dùng khi phát triển: viết node xử lý dữ liệu TRƯỚC khi có cảm biến/robot
thật, miễn là hai bên thống nhất đúng kiểu message và tên topic.
"""

import random

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64


class SensorPublisher(Node):
    def __init__(self):
        super().__init__("sensor_publisher")

        # declare_parameter: khai báo tham số CÓ THỂ đổi lúc chạy, không cần sửa code hay
        # build lại -- đổi qua CLI (`ros2 param set`) hoặc lúc launch (xem demo.launch.py).
        # Giá trị truyền vào là MẶC ĐỊNH, dùng khi không ai ghi đè.
        self.declare_parameter("publish_rate_hz", 1.0)
        self.declare_parameter("base_temperature", 25.0)

        publish_rate_hz = self.get_parameter("publish_rate_hz").value

        # Publisher: (kiểu message, tên topic, queue size). queue_size=10 nghĩa là nếu
        # subscriber xử lý chậm hơn tốc độ publish, tối đa 10 message được giữ lại chờ,
        # message cũ hơn sẽ bị loại bỏ (không phải "tràn bộ nhớ vô hạn").
        self.publisher_ = self.create_publisher(Float64, "sensor_data", 10)

        # Timer: gọi lại self.publish_reading mỗi (1 / publish_rate_hz) giây -- đây LÀ
        # cách chuẩn để "publish định kỳ" trong ROS 2, không dùng vòng lặp while+sleep thủ công.
        # LƯU Ý: publish_rate_hz chỉ đọc 1 LẦN ở đây -- đổi bằng `ros2 param set` lúc đang
        # chạy sẽ KHÔNG đổi tần số thật (timer đã tạo xong với period cũ), chỉ có tác dụng
        # nếu truyền qua launch argument LÚC KHỞI ĐỘNG. Xem base_temperature bên dưới để
        # thấy cách làm NGƯỢC LẠI (đọc lại mỗi lần) -- 2 kiểu tồn tại song song trong 1 node
        # là chuyện bình thường, tùy giá trị đó "gắn" với gì (period của timer khó đổi giữa
        # chừng mà không hủy/tạo lại timer; 1 phép cộng đơn giản thì đổi được ngay).
        timer_period = 1.0 / publish_rate_hz
        self.timer = self.create_timer(timer_period, self.publish_reading)

        self.get_logger().info(
            f"sensor_publisher bắt đầu, publish_rate_hz={publish_rate_hz}, "
            f"base_temperature={self.get_parameter('base_temperature').value}"
        )

    def publish_reading(self):
        # Đọc lại parameter MỖI LẦN publish (không cache vào self.xxx như publish_rate_hz ở
        # trên) -- nhờ vậy `ros2 param set /sensor_publisher base_temperature 30.0` lúc node
        # đang chạy có tác dụng NGAY ở lần publish kế tiếp, không cần restart node.
        base_temperature = self.get_parameter("base_temperature").value
        noise = random.uniform(-0.5, 0.5)
        reading = base_temperature + noise

        msg = Float64()
        msg.data = reading
        self.publisher_.publish(msg)
        self.get_logger().info(f"Publish: {reading:.2f}")


def main(args=None):
    rclpy.init(args=args)
    node = SensorPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
