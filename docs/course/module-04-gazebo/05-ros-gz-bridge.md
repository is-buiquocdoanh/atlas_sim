# 5. ros_gz_bridge và `/clock`

*[← Spawn robot](04-spawn-robot.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](06-bai-tap.md)*

## Định nghĩa

**`ros_gz_bridge`** là node dịch message qua lại giữa **Gazebo Transport** và **ROS 2 (DDS)**. Mỗi topic muốn đi qua ranh giới đó phải được khai báo tường minh: tên topic 2 bên, kiểu message 2 bên, và **chiều**.

**`/clock`** là topic mang thời gian *mô phỏng*. Khi `use_sim_time=true`, node ROS 2 bỏ đồng hồ hệ thống và chỉ dùng thời gian đọc từ `/clock`.

## Cơ chế

Một mục bridge gồm 5 trường:
```yaml
- ros_topic_name: "/scan"
  gz_topic_name: "/scan"
  ros_type_name: "sensor_msgs/msg/LaserScan"
  gz_type_name: "gz.msgs.LaserScan"
  direction: GZ_TO_ROS
```
`direction` có 3 giá trị: `GZ_TO_ROS` (cảm biến — dữ liệu chảy ra), `ROS_TO_GZ` (lệnh — dữ liệu chảy vào), `BIDIRECTIONAL` (hiếm dùng, dễ gây vòng lặp). Sai chiều thì topic hiện ra trong `ros2 topic list` nhưng `ros2 topic echo` không bao giờ có dữ liệu — một trong những lỗi tốn thời gian nhất của module này.

**Vì sao `use_sim_time` quan trọng đến vậy?** Mô phỏng hiếm khi chạy đúng tốc độ thật: RTF 0,6 nghĩa là 1 giây mô phỏng mất 1,7 giây thật. Node nào dùng đồng hồ hệ thống sẽ gán sai timestamp cho dữ liệu của nó, trong khi dữ liệu từ Gazebo mang timestamp mô phỏng. Hậu quả dây chuyền:

- TF: "transform quá cũ / ở tương lai" — `lookup_transform` thất bại lúc được lúc không.
- SLAM (Module 8): ghép sai scan với sai vị trí → bản đồ nhòe, tường đôi.
- Nav2 (Module 10): costmap tưởng dữ liệu cảm biến đã hết hạn, robot đứng im không rõ lý do.

Điều khó chịu là các lỗi này **không xuất hiện ở Module 4** — robot vẫn đứng đẹp. Chúng nổ ra ở Module 8-10, xa chỗ gây lỗi. Nên quy tắc: **mọi node chạy cùng mô phỏng đều phải đặt `use_sim_time=true`, không sót node nào.**

## Ví dụ trong dự án Atlas

`atlas_gazebo/config/gz_bridge.yaml` chỉ bridge **3 topic**, tất cả đều `GZ_TO_ROS`:

| Topic | Kiểu ROS 2 | Vì sao |
|---|---|---|
| `/clock` | `rosgraph_msgs/msg/Clock` | Nền tảng cho `use_sim_time` của toàn hệ thống |
| `/scan` | `sensor_msgs/msg/LaserScan` | Dữ liệu LiDAR (Module 6) |
| `/imu` | `sensor_msgs/msg/Imu` | Dữ liệu IMU (Module 6) |

Câu hỏi hay gặp: **`/cmd_vel` và `/odom` đâu?** Chúng cố ý **không** có trong bridge. Từ Module 5, `gz_ros2_control` chạy như một plugin **bên trong tiến trình Gazebo** nhưng nói DDS thẳng bằng `rclcpp` — dữ liệu không đi qua Gazebo Transport nên không có gì để bridge. Thêm dòng bridge cho `/cmd_vel` lúc đó sẽ tạo ra 2 nguồn cùng publish 1 topic và robot giật.

Đây là khác biệt thật giữa 2 kiểu tích hợp trong cùng một hệ thống:

| | Đi qua bridge | Không qua bridge |
|---|---|---|
| Ai phát | Sensor system của gz-sim | Plugin `gz_ros2_control` |
| Đường đi | Gazebo Transport → bridge → DDS | DDS thẳng |
| Ví dụ | `/scan`, `/imu`, `/clock` | `/cmd_vel`, `/odom`, `/joint_states` |

`use_sim_time: True` được đặt cho **cả** `robot_state_publisher` **và** node bridge trong `spawn_robot.launch.py` — không phải thừa: bridge cũng gán timestamp cho message nó dịch.

## Thử ngay

```bash
ros2 launch atlas_gazebo spawn_robot.launch.py
```
```bash
# /clock có chạy không -- nếu im lặng, Gazebo đang pause (thiếu cờ -r, xem bài 4)
ros2 topic echo /clock --once

# So sánh 2 thế giới topic
gz topic -l | wc -l        # rất nhiều
ros2 topic list            # chỉ những gì đã bridge + topic ROS thuần

# Node nào đang dùng sim time
ros2 param get /robot_state_publisher use_sim_time
```

Bài thử làm rõ ý nghĩa `/clock`:
```bash
ros2 topic echo /clock --once    # ghi lại số giây
# bấm nút Pause trong Gazebo, đợi 10 giây thật, rồi chạy lại:
ros2 topic echo /clock --once    # số KHÔNG tăng -- thời gian mô phỏng đã dừng
```
Trong khi đó đồng hồ hệ thống vẫn chạy. Chính khoảng cách giữa 2 đồng hồ này là thứ `use_sim_time` sinh ra để xử lý.

Thử phá bridge: comment khối `/imu` trong `gz_bridge.yaml`, build lại, chạy lại → `ros2 topic list` không còn `/imu`, trong khi `gz topic -l` vẫn có. Dữ liệu vẫn được mô phỏng đầy đủ, chỉ là ROS 2 không thấy.

---
*Tiếp theo: [Bài tập →](06-bai-tap.md)*
