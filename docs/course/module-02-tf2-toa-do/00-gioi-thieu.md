# Module 2 — TF2 & tọa độ

*Giai đoạn 1: Nền tảng ROS 2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 1](../module-01-ros2-core-concepts/00-gioi-thieu.md) (đặc biệt [Topic](../module-01-ros2-core-concepts/03-topic-pub-sub.md) — TF chỉ là 1 lớp tiện ích xây trên pub/sub).*

**Thời lượng ước tính**: 3-4 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-frame-va-transform.md](01-frame-va-transform.md) | Frame và Transform là gì |
| 2 | [02-tf-tree.md](02-tf-tree.md) | TF tree, broadcaster, listener |
| 3 | [03-rep103-rep105.md](03-rep103-rep105.md) | Quy ước REP-103/REP-105, vì sao tách `map`/`odom` |
| 4 | [04-cong-cu-debug.md](04-cong-cu-debug.md) | Công cụ: `static_transform_publisher`, `view_frames`, `tf2_echo` |
| 5 | [05-bai-tap.md](05-bai-tap.md) | Bài tập: vẽ tay TF tree của Atlas |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong bài học (`ros2_basics`) → Ví dụ trong dự án Atlas.

## Mục tiêu chung của module

Hiểu vì sao mọi dữ liệu robot trong ROS 2 đều "gắn với 1 frame"; đọc và tự tay dựng được 1 cây TF nhỏ; giải thích được vì sao ROS tách riêng `map` và `odom` thay vì gộp làm một — nền tảng bắt buộc trước khi chạm URDF (Module 3, cây TF thật của Atlas) và AMCL (Module 9, nơi khái niệm `map` vs `odom` mới thực sự "sống động").

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select ros2_basics
source install/setup.bash
```
