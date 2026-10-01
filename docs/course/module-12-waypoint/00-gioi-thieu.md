# Module 12 — Waypoint following & Nav2 Simple Commander API

*Giai đoạn 3: Navigation2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 11](../module-11-recovery-bt/00-gioi-thieu.md) — robot đã tự né vật cản, tự khắc phục sự cố, giờ học cách TỰ VIẾT CODE điều khiển nó thay vì chỉ cấu hình.*

**Thời lượng ước tính**: 4-5 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-action-client-waypoint.md](01-action-client-waypoint.md) | Action client/server — vì sao navigation PHẢI dùng action |
| 2 | [02-nav2-simple-commander.md](02-nav2-simple-commander.md) | `BasicNavigator`: waypoint, feedback, hủy giữa chừng |
| 3 | [03-bai-tap.md](03-bai-tap.md) | Bài tập: tự viết `patrol_node.py` |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Từ module này, bạn không còn chỉ gửi 1 goal rồi đợi ([Module 10](../module-10-nav2-core/00-gioi-thieu.md)) — viết được code Python đầy đủ: nhiều waypoint liên tiếp, đọc feedback khi đang chạy, hủy giữa chừng theo logic riêng. Đây là bước chuẩn bị trực tiếp cho **Module 13 — Capstone**: đồ án cuối khóa sẽ cần đúng kỹ năng này để tự động hóa 1 kịch bản hoàn chỉnh (vd robot giao hàng tuần tra nhiều điểm).

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_slam atlas_apps
source install/setup.bash
```
`atlas_apps` là package **TRỐNG, cố tình** — nơi bạn tự viết bài tập của module này (xem [01-cấu-trúc-workspace](../../overview/01-cau-truc-workspace.md)), khác `atlas_slam/scripts/` chứa code mẫu đã viết sẵn để tham khảo.
