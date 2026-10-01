# 5. Gửi goal: RViz, CLI, code

*[← Behavior Tree Navigator](04-behavior-tree-navigator.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](06-bai-tap.md)*

## Định nghĩa

Gửi goal = gọi action `NavigateToPose` (xem lại [action, giới thiệu ở Module 1](../module-01-ros2-core-concepts/03-topic-pub-sub.md) — tác vụ dài, cần feedback + hủy được) tới `bt_navigator`. 3 cách gọi tương đương, khác ở mức độ tiện/tự động hóa.

## Cơ chế

- **RViz, nút "Nav2 Goal"**: click trực quan trên bản đồ, kéo chọn hướng — cách nhanh nhất để test tay, không ghi lại được số liệu.
- **CLI**: `ros2 action send_goal` — gọi được từ script shell, thấy được cấu trúc message thật.
- **Code (`nav2_simple_commander`)**: `BasicNavigator` bọc sẵn action client, có `waitUntilNav2Active()` (chờ toàn bộ lifecycle manager active trước khi gửi, tránh gửi hụt lúc hệ thống chưa sẵn sàng) và `isTaskComplete()`/`getResult()` tiện polling — đây là cách DUY NHẤT đo được thời gian hoàn thành tự động, cần cho [bài tập](06-bai-tap.md).

## Ví dụ trong dự án Atlas

`atlas_slam/scripts/send_goal_and_time.py` — dùng `nav2_simple_commander`:
```python
nav = BasicNavigator()
nav.waitUntilNav2Active()
goal = PoseStamped()
goal.header.frame_id = "map"
goal.pose.position.x, goal.pose.position.y = args.goal_x, args.goal_y
t0 = time.time()
nav.goToPose(goal)
while not nav.isTaskComplete():
    rclpy.spin_once(nav, timeout_sec=0.2)
elapsed = time.time() - t0
```
Vòng lặp `spin_once` + `isTaskComplete()` là pattern CHUẨN để chờ 1 action chạy xong mà không block hẳn (khác `rclpy.spin()` thông thường) — sẽ gặp lại chính pattern này khi tự viết node điều hướng ở Module 12.

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
ros2 launch atlas_slam navigation.launch.py map:=$(pwd)/src/atlas_slam/maps/maze_map.yaml
```
Cách 1 — RViz: đặt 2D Pose Estimate, bấm "Nav2 Goal", click 1 điểm trên map.

Cách 2 — CLI (terminal khác):
```bash
ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose \
  "{pose: {header: {frame_id: 'map'}, pose: {position: {x: -1.5, y: 1.8}, orientation: {w: 1.0}}}}" --feedback
```
Cách 3 — script có sẵn:
```bash
ros2 run atlas_slam send_goal_and_time.py --goal_x -1.5 --goal_y 1.8
```
So kết quả cả 3 cách — robot phải đi tới đúng 1 chỗ, chỉ khác cách bạn ra lệnh.

---
*Tiếp theo: [Bài tập →](06-bai-tap.md)*
