# 3. Bài tập: tự viết `patrol_node.py`

*[← Nav2 Simple Commander](02-nav2-simple-commander.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Action client/server](01-action-client-waypoint.md), [Nav2 Simple Commander](02-nav2-simple-commander.md).

## Đề bài

Viết `patrol_node.py` trong `atlas_apps` (package **trống**, xem [00-gioi-thieu.md](00-gioi-thieu.md)) — robot tuần tra **vô hạn** qua các waypoint, khác `waypoint_demo.py` ([bài 2](02-nav2-simple-commander.md)) ở chỗ đó chỉ chạy 1 vòng rồi dừng.

### Yêu cầu

1. Dùng lại 4 waypoint của `waypoint_demo.py` (hoặc tự chọn điểm khác, miễn nằm trong `maze.sdf`).
2. Sau khi `followWaypoints()` hoàn tất (`isTaskComplete()` → `True`, `result == SUCCEEDED`), **gửi lại đúng danh sách đó** — lặp vô hạn, không thoát chương trình.
3. In ra số vòng đã tuần tra hoàn chỉnh (vd `"Hoàn thành vòng tuần tra #3"`).
4. `Ctrl+C` phải hủy sạch — không traceback, không lỗi `rcl_shutdown already called` (xem lại gotcha ở [bài 2](02-nav2-simple-commander.md)).

### Gợi ý cấu trúc

```python
# atlas_apps/atlas_apps/patrol_node.py
import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator

def main():
    rclpy.init()
    nav = BasicNavigator()
    nav.waitUntilNav2Active()

    # TODO: tạo goal_poses, giống make_pose() trong waypoint_demo.py

    vong = 0
    try:
        while True:
            # TODO: followWaypoints, vòng lặp chờ isTaskComplete()
            # TODO: nếu CANCELED (do Ctrl+C trong lúc đang đi) -- thoát vòng while
            # TODO: nếu SUCCEEDED -- vong += 1, in ra, lặp lại
            pass
    except KeyboardInterrupt:
        nav.cancelTask()

    if rclpy.ok():
        rclpy.shutdown()
```

Nhớ thêm `entry_points` trong `atlas_apps/setup.py` (xem comment sẵn trong file, và [07-cấu-trúc-package, Module 1](../module-01-ros2-core-concepts/07-cau-truc-package.md) nếu quên cú pháp), rồi build lại:
```bash
colcon build --packages-select atlas_apps
source install/setup.bash
ros2 run atlas_apps patrol_node.py
```

## Gợi ý xử lý lỗi

- `result` trả về là 1 trong 3 giá trị: `TaskResult.SUCCEEDED`, `TaskResult.CANCELED`, `TaskResult.FAILED` (import từ `nav2_simple_commander.robot_navigator`) — phân biệt rõ CANCELED (do người dùng) với FAILED (do kẹt/lỗi thật) trước khi quyết định có lặp lại vòng tiếp theo không.
- Nếu `FAILED` liên tục không rõ lý do, quay lại đọc log `bt_navigator` ([Module 11](../module-11-recovery-bt/00-gioi-thieu.md)) trước khi nghi ngờ code `patrol_node.py`.

## Tự kiểm tra

- [ ] Chạy được ít nhất 2 vòng tuần tra liên tiếp không cần can thiệp.
- [ ] Log in đúng số vòng đã hoàn thành.
- [ ] `Ctrl+C` giữa lúc đang đi thoát sạch, không traceback.
- [ ] Phân biệt được code của `patrol_node.py` (tự viết, `atlas_apps`) với `waypoint_demo.py` (mẫu tham khảo, `atlas_slam/scripts`) — giải thích được vì sao tách 2 package này.

Xong hết → sang **Module 13 — Capstone**, đồ án cuối khóa dùng đúng kỹ năng action/waypoint vừa học để tự động hóa 1 kịch bản hoàn chỉnh.
