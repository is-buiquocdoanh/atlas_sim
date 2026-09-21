# Module 1 — ROS 2 Core Concepts

*Giai đoạn 1: Nền tảng ROS 2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này, giả định Module 0 đã xong (môi trường ROS 2 Humble + Gazebo Fortress chạy được — xem [03-yeu-cau-moi-truong.md](../../overview/03-yeu-cau-moi-truong.md)).*

**Thời lượng ước tính**: 6-8 giờ.

## Cách đọc module này

Mỗi khái niệm có **1 file riêng**, theo đúng thứ tự nên đọc:

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-ros2-va-dds.md](01-ros2-va-dds.md) | ROS 2 là gì, kiến trúc DDS, vì sao không cần `roscore` |
| 2 | [02-node.md](02-node.md) | Node — đơn vị chạy nhỏ nhất của ROS 2 |
| 3 | [03-topic-pub-sub.md](03-topic-pub-sub.md) | Topic, Publisher/Subscriber, QoS |
| 4 | [04-service.md](04-service.md) | Service — request/response |
| 5 | [05-parameter.md](05-parameter.md) | Parameter — cấu hình không cần sửa code |
| 6 | [06-launch-file.md](06-launch-file.md) | Launch file — khởi động nhiều node cùng lúc |
| 7 | [07-cau-truc-package.md](07-cau-truc-package.md) | Cấu trúc 1 package ROS 2 (`ament_python`) |
| 8 | [08-bai-tap.md](08-bai-tap.md) | Bài tập: `temperature_monitor` |

Mỗi file (trừ file đầu — kiến trúc tổng quan, và file cuối — bài tập) theo đúng 1 khuôn:
1. **Định nghĩa** — khái niệm là gì, chính xác, đủ để trích dẫn.
2. **Cơ chế** — hoạt động thế nào bên dưới, khi nào dùng/không nên dùng.
3. **Ví dụ trong bài học** — code trong `src/ros2_basics/`, tự chạy thử được ngay.
4. **Ví dụ trong dự án Atlas** — chính khái niệm đó xuất hiện ở đâu trong `atlas_sim`, dù bạn chưa học tới package đó — để thấy khái niệm không phải lý thuyết suông, mà là thứ đang thực sự chạy trong dự án bạn sẽ xây từ Module 3 trở đi.

## Mục tiêu chung của module

Sau khi đọc hết 8 file, bạn: giải thích được ROS 2 dựa trên kiến trúc DDS gì; tự viết được node, publisher/subscriber, service, parameter, launch file; phân biệt được khi nào dùng topic, khi nào dùng service; và đọc được các file thật trong `atlas_control`, `atlas_gazebo`, `atlas_slam`... nhận ra ngay đâu là node/topic/parameter dù chưa học sâu package đó.

## Chuẩn bị

Code thực hành của module này nằm ở `src/ros2_basics/` (đã có sẵn trong repo — không phải "đáp án ẩn", nên mở đọc song song khi đọc từng file). Build trước khi bắt đầu:

```bash
cd ~/atlas_sim
colcon build --packages-select ros2_basics
source install/setup.bash
```
