# Module 11 — Recovery behaviors & Behavior Tree

*Giai đoạn 3: Navigation2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 10](../module-10-nav2-core/00-gioi-thieu.md) — đã gặp `bt_navigator` ở đó, module này mở nó ra xem bên trong.*

**Thời lượng ước tính**: 4-5 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-behavior-tree-vs-state-machine.md](01-behavior-tree-vs-state-machine.md) | Behavior Tree là gì, so với state machine |
| 2 | [02-doc-bt-xml.md](02-doc-bt-xml.md) | Đọc file BT XML mặc định của Atlas, từng loại node |
| 3 | [03-recovery-behaviors.md](03-recovery-behaviors.md) | 4 recovery behavior thật: spin, wait, backup, clear costmap |
| 4 | [04-bai-tap.md](04-bai-tap.md) | Bài tập: tạo tình huống kẹt, tùy chỉnh BT |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Robot Atlas giờ không còn "đứng im mãi" khi gặp sự cố (kẹt, mất đường) — tự kích hoạt hành vi khắc phục trước khi báo thất bại hẳn. Đọc hiểu được 1 file BT XML thật (không chỉ nghe mô tả), biết sửa nó (thêm/bớt 1 recovery behavior) mà không cần build lại code — đúng tinh thần tách cấu hình khỏi logic đã gặp xuyên suốt khóa học.

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_slam
source install/setup.bash
```
Không cần code mới — mọi thứ trong module này đã chạy sẵn mỗi khi bạn dùng Nav2 từ Module 10, chỉ chưa "mở nắp" xem bên trong.
