# Module 10 — Nav2 core: costmap, planner, controller

*Giai đoạn 3: Navigation2. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 9](../module-09-amcl/00-gioi-thieu.md) — robot phải biết mình ở đâu trước khi tự đi tới đâu đó.*

**Thời lượng ước tính**: 8-10 giờ — **module trọng tâm của khóa học**.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-costmap.md](01-costmap.md) | Costmap: 3 layer, global vs local |
| 2 | [02-global-planner.md](02-global-planner.md) | NavFn vs Smac — tìm đường toàn cục |
| 3 | [03-local-controller.md](03-local-controller.md) | DWB vs RPP vs MPPI — bám đường cục bộ |
| 4 | [04-behavior-tree-navigator.md](04-behavior-tree-navigator.md) | `bt_navigator` — ai điều phối ai |
| 5 | [05-gui-cli-goal.md](05-gui-cli-goal.md) | Gửi goal: RViz, CLI, `send_goal_and_time.py` |
| 6 | [06-bai-tap.md](06-bai-tap.md) | Bài tập trọng tâm: so sánh 3 controller |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Robot tự đi từ A đến B, tự né vật cản — không còn cần bạn cầm bàn phím. Hiểu đủ sâu kiến trúc Nav2 (costmap nuôi dữ liệu cho planner, planner vạch đường cho controller, controller ra lệnh `cmd_vel` thật) để **tự chọn và tinh chỉnh** thuật toán cho bài toán cụ thể, không chỉ chạy được config có sẵn. Đây là phần "Hiểu vì sao" nặng nhất khóa học — nội dung đủ để trích dẫn trực tiếp vào báo cáo đồ án (so sánh planner, so sánh controller).

## Chuẩn bị

```bash
cd ~/atlas_sim
colcon build --packages-select atlas_slam
source install/setup.bash
```
Cần robot đã định vị đúng (Module 9) trước khi gửi goal — Nav2 sẽ KHÔNG tự chạy nếu chưa biết robot đang ở đâu trên bản đồ.
