# Module 3 — Mô hình hóa robot với URDF/XACRO

*Giai đoạn 2: Mô phỏng robot Atlas. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 2](../module-02-tf2-toa-do/00-gioi-thieu.md) — URDF chính là cách khai báo cả một cây TF bằng file XML thay vì viết `TransformBroadcaster` tay.*

**Thời lượng ước tính**: 6-8 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-urdf-la-gi.md](01-urdf-la-gi.md) | URDF là gì, quan hệ link/joint/frame |
| 2 | [02-link.md](02-link.md) | `<link>`: visual, collision, inertial |
| 3 | [03-joint.md](03-joint.md) | `<joint>`: các loại joint, `origin`, `axis` |
| 4 | [04-xacro.md](04-xacro.md) | XACRO: property, macro, include — vì sao không viết URDF thuần |
| 5 | [05-robot-state-publisher.md](05-robot-state-publisher.md) | Từ URDF ra TF: `robot_state_publisher`, `/joint_states`, RViz |
| 6 | [06-doc-urdf-atlas.md](06-doc-urdf-atlas.md) | Đọc trọn URDF thật của Atlas, hiểu từng quyết định thiết kế |
| 7 | [07-bai-tap.md](07-bai-tap.md) | Bài tập: đổi `wheel_radius` / `wheel_separation` bằng tham số |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Tự viết được URDF/XACRO cho một robot diff-drive từ đầu; phân biệt được link/joint/frame và biết chọn đúng loại joint; hiểu vì sao dùng xacro macro thay vì copy-paste; xem được robot trong RViz và giải thích được cây TF hiện ra chính là cây mình đã khai báo trong file.

Module này **chưa có vật lý** (robot chưa rơi, chưa va chạm) — đó là Module 4. Ở đây robot chỉ là hình học + quan hệ tọa độ.

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_description
source install/setup.bash
ros2 launch atlas_description display.launch.py
```

RViz mở lên, thấy robot Atlas trắng-đen + cửa sổ slider `joint_state_publisher_gui` → môi trường đã sẵn sàng. Kéo slider, 2 bánh xe phải quay.
