# Module 7 — Teleoperation & RViz

*Giai đoạn 2: Mô phỏng robot Atlas. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 6](../module-06-cam-bien/00-gioi-thieu.md) — robot phải di chuyển được và có cảm biến thì lái tay mới có ý nghĩa.*

**Thời lượng ước tính**: 2-3 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-teleop-twist-keyboard.md](01-teleop-twist-keyboard.md) | `teleop_twist_keyboard` — publish `/cmd_vel` từ bàn phím |
| 2 | [02-cau-hinh-rviz.md](02-cau-hinh-rviz.md) | Tự cấu hình RViz: RobotModel, TF, LaserScan, Odometry |
| 3 | [03-twist-mux.md](03-twist-mux.md) | `twist_mux` — trọng tài khi có nhiều nguồn `cmd_vel` |
| 4 | [04-bai-tap.md](04-bai-tap.md) | Bài tập: lái hết mê cung, đo thời gian làm baseline |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Lái Atlas thủ công thành thạo, vừa lái vừa đọc được RViz (biết robot đang thấy gì, đi đâu) — đây là kỹ năng nền để Module 8 (SLAM) không biến thành "lái mù". Hiểu vì sao cần 1 "trọng tài" (`twist_mux`) ngay khi có từ 2 nguồn phát `cmd_vel` trở lên, dù ở module này chỉ có 1 nguồn (bàn phím) — khái niệm sẽ dùng thật khi Nav2 (Module 10) trở thành nguồn thứ 2.

Module này **không có package mới** — chỉ dùng lại `teleop_twist_keyboard` (gói chuẩn ROS 2) và `atlas_bringup` đã có từ trước (xem vì sao không có `atlas_teleop` riêng ở [bài RViz](02-cau-hinh-rviz.md)).

## Chuẩn bị

```bash
cd ~/atlas_sim
source install/setup.bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
```
Terminal thứ hai, xác nhận lái được:
```bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```
Nhấn `i` robot tiến lên trong Gazebo → môi trường sẵn sàng.
