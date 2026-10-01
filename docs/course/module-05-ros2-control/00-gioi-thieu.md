# Module 5 — Điều khiển với ros2_control

*Giai đoạn 2: Mô phỏng robot Atlas. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 4](../module-04-gazebo/00-gioi-thieu.md) — robot phải đứng vững trong Gazebo trước khi bắt nó chạy.*

**Thời lượng ước tính**: 5-6 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-ros2-control-la-gi.md](01-ros2-control-la-gi.md) | Kiến trúc 3 tầng, `controller_manager`, vì sao tách lớp |
| 2 | [02-hardware-interface.md](02-hardware-interface.md) | Thẻ `<ros2_control>` trong URDF, command/state interface |
| 3 | [03-controller-va-spawner.md](03-controller-va-spawner.md) | File config, `spawner`, vòng đời controller |
| 4 | [04-dong-hoc-vi-sai.md](04-dong-hoc-vi-sai.md) | Công thức động học vi sai, giới hạn tốc độ/gia tốc |
| 5 | [05-odom-va-tf.md](05-odom-va-tf.md) | `/odom`, TF `odom`→`base_footprint`, sai số odometry |
| 6 | [06-bai-tap.md](06-bai-tap.md) | Bài tập: tính tay vận tốc bánh rồi kiểm chứng trong Gazebo |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Robot Atlas **chạy được** bằng `/cmd_vel`: tiến, lùi, quay tại chỗ. Hiểu kiến trúc `ros2_control` đủ để trả lời câu hỏi cốt lõi — vì sao người ta dựng cả một bộ khung phức tạp như vậy thay vì viết thẳng một node nhận `/cmd_vel` rồi quay bánh. Tự tay tính được vận tốc 2 bánh từ `(v, ω)` và kiểm chứng lại bằng số liệu thật từ mô phỏng.

Từ module này trở đi robot bắt đầu **báo cáo vị trí của chính nó** qua `/odom` — mắt xích mà SLAM (Module 8) và Nav2 (Module 10) đều dựa vào.

## Chuẩn bị

```bash
cd ~/atlas_sim
./scripts/setup.sh            # đảm bảo có ros-humble-gz-ros2-control
source install/setup.bash
ros2 launch atlas_control controller.launch.py
```

Terminal thứ hai:
```bash
ros2 control list_controllers
```
Thấy `joint_state_broadcaster` và `diff_drive_controller` đều **active** → sẵn sàng. Nếu 2 spawner cứ báo `waiting for service /controller_manager/list_controllers...` thì dừng lại xử lý trước — xem [bài 3](03-controller-va-spawner.md).
