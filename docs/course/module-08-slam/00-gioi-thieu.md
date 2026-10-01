# Module 8 — SLAM: tự vẽ bản đồ

*Giai đoạn 3: Navigation2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 7](../module-07-teleoperation/00-gioi-thieu.md) — SLAM cần lái tay thành thạo, và baseline thời gian đã đo sẽ dùng lại ở Module 10.*

**Thời lượng ước tính**: 5-6 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-slam-nguyen-ly.md](01-slam-nguyen-ly.md) | SLAM là gì: scan matching, pose graph, loop closure |
| 2 | [02-slam-toolbox-thuc-hanh.md](02-slam-toolbox-thuc-hanh.md) | Chạy `slam_toolbox`, đọc `mapper_params.yaml` |
| 3 | [03-luu-ban-do.md](03-luu-ban-do.md) | 2 định dạng bản đồ: `map_saver_cli` vs `serialize_map` |
| 4 | [04-bai-tap.md](04-bai-tap.md) | Bài tập: tự vẽ bản đồ `maze.sdf`, so với world gốc |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Hiểu SLAM ở mức đủ để giải thích trong báo cáo đồ án (không chỉ "chạy lệnh ra bản đồ"): vì sao ghép được nhiều scan rời rạc thành 1 bản đồ liền mạch, vì sao đôi khi bản đồ "nhảy" giữa chừng, và 2 định dạng file bản đồ khác nhau để làm gì — tự vẽ được bản đồ hoàn chỉnh của world `maze.sdf` bằng chính robot Atlas.

Đây là module đầu tiên của Giai đoạn 3 — mọi thứ (hình dạng, vật lý, điều khiển, cảm biến, lái tay) xây ở Giai đoạn 2 giờ hợp lại để làm 1 việc có ý nghĩa: cho robot **tự hiểu** không gian nó đang ở.

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_slam
source install/setup.bash
```
Bản đồ mẫu đã có sẵn ở `src/atlas_slam/maps/maze_map.*` — dùng để đối chiếu, không phải để chép (bài tập yêu cầu tự vẽ lại).
