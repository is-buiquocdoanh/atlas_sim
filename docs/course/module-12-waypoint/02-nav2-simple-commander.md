# 2. Nav2 Simple Commander — `BasicNavigator`

*[← Action client/server](01-action-client-waypoint.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](03-bai-tap.md)*

## Định nghĩa

`nav2_simple_commander` là thư viện Python wrapper quanh các action của Nav2 — gọi `NavigateToPose`/`FollowWaypoints` mà không phải tự viết `ActionClient` ([bài trước](01-action-client-waypoint.md)) thủ công. Trung tâm là class `BasicNavigator`.

## Cơ chế

4 việc cốt lõi khi dùng `BasicNavigator` cho waypoint:

| Việc | Hàm | Ghi chú |
|---|---|---|
| Đợi Nav2 sẵn sàng | `waitUntilNav2Active()` | Chặn tới khi các lifecycle node đã `active` |
| Gửi nhiều điểm | `followWaypoints(poses)` | Nhận `list[PoseStamped]`, trả về ngay (không chặn) |
| Đọc tiến độ | `isTaskComplete()`, `getFeedback()` | Gọi trong vòng lặp, `feedback.current_waypoint` = đang đi tới điểm thứ mấy |
| Hủy | `cancelTask()` | Dừng giữa chừng, action trả `result = CANCELED` |

Điểm khác `goToPose()` (1 điểm, [Module 10](../module-10-nav2-core/05-gui-cli-goal.md)): `followWaypoints()` nhận cả mảng, server tự đi lần lượt — client chỉ cần theo dõi `current_waypoint` để biết đang ở điểm nào, không phải tự gửi lại goal kế tiếp.

## Ví dụ trong dự án Atlas

`src/atlas_slam/scripts/waypoint_demo.py` — 4 điểm cố định quanh `maze.sdf`:

```python
WAYPOINTS = [(-2.5, 0.0), (0.0, 2.0), (2.5, 0.0), (0.0, -2.0)]
...
nav.followWaypoints(goal_poses)
while not nav.isTaskComplete():
    feedback = nav.getFeedback()
    if feedback:
        print(f"Đang đi tới waypoint #{feedback.current_waypoint}/{len(WAYPOINTS)}")
    rclpy.spin_once(nav, timeout_sec=0.5)
result = nav.getResult()
```

**Gotcha có thật, gặp khi viết file này**: nhấn Ctrl+C giữa lúc đang chạy ném lỗi `RCLError: rcl_shutdown already called`. Lý do: `BasicNavigator` có handler SIGINT riêng của rclpy, có thể đã tự gọi `rclpy.shutdown()` trước khi code chạy tới dòng shutdown của chính script. Sửa bằng 2 thay đổi:
1. `nav.getResult()` chỉ gọi khi vòng lặp kết thúc bình thường (trong `try`, không phải sau `except`).
2. Dòng `shutdown()` cuối cùng bọc `if rclpy.ok():`.

Xem nguyên văn xử lý trong khối `try/except KeyboardInterrupt` của file trên — đây là lý do thực tế, không phải phòng hờ lý thuyết.

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
ros2 launch atlas_slam navigation.launch.py map:=$(pwd)/src/atlas_slam/maps/maze_map.yaml
```
```bash
ros2 run atlas_slam waypoint_demo.py
```
Quan sát log `Đang đi tới waypoint #...` tăng dần theo robot trong Gazebo. Nhấn `Ctrl+C` giữa chừng — robot dừng lại, log in `Ctrl+C -- hủy task giữa chừng...`, script thoát sạch (không traceback).

---
*Tiếp theo: [Bài tập →](03-bai-tap.md)*
