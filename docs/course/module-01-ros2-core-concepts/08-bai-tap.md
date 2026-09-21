# 8. Bài tập: `temperature_monitor`

*[← Cấu trúc package](07-cau-truc-package.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng tất cả khái niệm đã học ở 7 bài trước: [ROS 2 & DDS](01-ros2-va-dds.md), [Node](02-node.md), [Topic/Pub-Sub](03-topic-pub-sub.md), [Service](04-service.md) *(không bắt buộc dùng ở bài tập này, nhưng nên hiểu vì sao KHÔNG cần)*, [Parameter](05-parameter.md), [Launch file](06-launch-file.md), [Cấu trúc package](07-cau-truc-package.md).

## Yêu cầu

Tự gõ lại (không copy nguyên `ros2_basics` rồi đổi tên — mục đích là nhớ, không phải có code chạy được):

1. **Node `temp_sensor`** — publish nhiệt độ giả lập (kiểu `std_msgs/msg/Float64`, tên topic tùy bạn đặt) mỗi giây, có tham số cho giá trị nền (giống `base_temperature` đã thấy).
2. **Node `temp_alert`** — subscribe topic đó; nếu giá trị **vượt ngưỡng** (tham số `threshold_celsius`, mặc định `28.0`), log **CẢNH BÁO** bằng `self.get_logger().warn(...)`; ngược lại log bình thường bằng `.info(...)`. Để ý màu log 2 mức này khác nhau thế nào trong terminal.
3. **Launch file** chạy cả 2 node cùng lúc, cho phép đổi `threshold_celsius` qua launch argument.

## Gợi ý (không phải đáp án)

- Có thể tái cấu trúc gần giống `sensor_publisher.py`/`data_logger.py` — khác chủ yếu ở logic so sánh ngưỡng trong callback subscriber của `temp_alert`.
- Quyết định (và giải thích được vì sao) `threshold_celsius` nên đọc 1 lần lúc khởi tạo hay đọc lại mỗi lần trong callback — xem lại phần "Đọc 1 lần vs đọc lại mỗi lần" ở [bài Parameter](05-parameter.md). Cả 2 cách đều "chạy được", khác nhau ở việc `ros2 param set threshold_celsius ...` giữa chừng có tác dụng ngay hay không.
- Muốn test nhanh không cần viết `temp_sensor` riêng: tạm dùng `ros2 run ros2_basics sensor_publisher` (đổi `base_temperature` qua `ros2 param set` để mô phỏng "vượt ngưỡng") làm nguồn dữ liệu, chỉ tự viết `temp_alert`.

## Tự kiểm tra đã xong bài tập

- [ ] `ros2 run` chạy được từng node độc lập.
- [ ] `ros2 launch` chạy được cả 2 cùng lúc; đổi `threshold_celsius:=` qua CLI thấy log đổi hành vi đúng.
- [ ] Đặt nhiệt độ nền cao hơn ngưỡng, thấy log **WARN** (không phải INFO) xuất hiện.
- [ ] Giải thích được (nói thành lời, không cần viết) tại sao bài này dùng topic chứ không phải service cho việc truyền nhiệt độ liên tục.

## Tự kiểm tra trước khi qua Module 2

- [ ] Giải thích được khác biệt topic/service/action bằng ví dụ của riêng bạn (không lặp lại ví dụ trong bài học).
- [ ] Biết dùng `ros2 topic info <topic> --verbose` để xem QoS, nói được `RELIABLE`/`BEST_EFFORT` khác nhau ở đâu.
- [ ] Tự tạo được 1 package `ament_python` mới từ đầu bằng `ros2 pkg create` mà không cần copy từ `ros2_basics`.
- [ ] Đọc được `atlas_control/launch/controller.launch.py` và chỉ ra được đâu là `Node`, đâu là `IncludeLaunchDescription`, đâu là `DeclareLaunchArgument` — dù chưa học sâu package đó.
- [ ] Hoàn thành bài tập `temperature_monitor` ở trên.

Xong hết → sang **Module 2 — TF2 & tọa độ** *(nội dung chi tiết sẽ viết ở thư mục riêng, cùng cấu trúc với module này, sau khi Module 1 được duyệt)*.
