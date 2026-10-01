# Module 9 — Localization với AMCL

*Giai đoạn 3: Navigation2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 8](../module-08-slam/00-gioi-thieu.md) — cần có bản đồ đã lưu mới định vị được.*

**Thời lượng ước tính**: 3-4 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-particle-filter.md](01-particle-filter.md) | Monte Carlo Localization: particle cloud, hội tụ |
| 2 | [02-amcl-thuc-hanh.md](02-amcl-thuc-hanh.md) | Chạy AMCL, 2D Pose Estimate, quan sát hội tụ |
| 3 | [03-amcl-vs-slam-toolbox.md](03-amcl-vs-slam-toolbox.md) | 2 cách định vị trong dự án — khi nào chọn cái nào |
| 4 | [04-bai-tap.md](04-bai-tap.md) | Bài tập: đặt sai pose, đo thời gian AMCL tự sửa |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Phân biệt rõ SLAM (Module 8 — **tạo** bản đồ) với localization (module này — **dùng** bản đồ đã có để biết mình ở đâu) — 2 việc dễ nhầm vì cùng publish `map`→`odom`. Hiểu Particle Filter đủ sâu để giải thích trong báo cáo đồ án: vì sao cần rải hạt ban đầu, vì sao hạt tự hội tụ, và khi nào nó KHÔNG tự hội tụ được.

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_slam
source install/setup.bash
```
Cần bản đồ đã lưu từ [Module 8](../module-08-slam/00-gioi-thieu.md) — dùng `src/atlas_slam/maps/maze_map.yaml` có sẵn, hoặc bản đồ tự vẽ ở bài tập Module 8.
