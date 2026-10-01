# Module 4 — Đưa robot vào Gazebo

*Giai đoạn 2: Mô phỏng robot Atlas. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 3](../module-03-urdf-xacro/00-gioi-thieu.md) — ở đây `<collision>` và `<inertial>` đã viết lần đầu tiên gây ra hậu quả thật.*

**Thời lượng ước tính**: 5-6 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-gazebo-la-gi.md](01-gazebo-la-gi.md) | gz-sim (Fortress) vs Gazebo Classic, kiến trúc 2 thế giới topic |
| 2 | [02-vat-ly-inertia.md](02-vat-ly-inertia.md) | Khối lượng, inertia, collision, ma sát — vì sao robot "nổ" |
| 3 | [03-world-file.md](03-world-file.md) | World SDF: sân, đèn, `<physics>`, plugin hệ thống |
| 4 | [04-spawn-robot.md](04-spawn-robot.md) | Launch: mở world, publish URDF, `ros_gz_sim create` |
| 5 | [05-ros-gz-bridge.md](05-ros-gz-bridge.md) | `ros_gz_bridge`, `/clock` và `use_sim_time` |
| 6 | [06-bai-tap.md](06-bai-tap.md) | Bài tập: robot đứng vững + cố ý phá vật lý để thấy lỗi |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Robot Atlas đứng vững trong Gazebo Fortress với vật lý thật: có trọng lượng, có ma sát, va chạm được với tường. Hiểu vì sao Gazebo và ROS 2 là **hai hệ thống truyền tin riêng biệt** phải nối bằng bridge, và vì sao `use_sim_time` là thứ bắt buộc phải đúng ngay từ module này — sai nó thì đến Module 8 (SLAM) mới phát hiện, lúc đó rất khó lần ra.

Robot ở module này **chưa chạy được** — chưa có controller. Gửi `/cmd_vel` lúc này không có gì xảy ra; đó là Module 5.

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_description atlas_gazebo
source install/setup.bash
ros2 launch atlas_gazebo spawn_robot.launch.py
```

Cửa sổ Gazebo mở ra, robot Atlas trắng đứng giữa sân xám, **không rung, không trôi, không lật** → môi trường đã sẵn sàng. Góc dưới phải xem chỉ số **RTF (real time factor)**: nên quanh 1.0.
