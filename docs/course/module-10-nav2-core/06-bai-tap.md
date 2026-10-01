# 6. Bài tập trọng tâm: so sánh DWB / RPP / MPPI

*[← Gửi goal](05-gui-cli-goal.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng toàn bộ module: [Costmap](01-costmap.md), [Global planner](02-global-planner.md), [Local controller](03-local-controller.md), [Gửi goal](05-gui-cli-goal.md). Đây là bài tập **quan trọng nhất khóa học** — kết quả dùng được thẳng vào phần thực nghiệm của báo cáo đồ án.

## Yêu cầu

1. Chọn 1 goal cố định (toạ độ `x, y` cụ thể, cách xa điểm xuất phát, phải vòng qua ít nhất 1 góc cua của `maze.sdf`) — dùng **ĐÚNG 1 toạ độ này cho cả 3 lần chạy**.
2. Với mỗi controller (`dwb`, `rpp`, `mppi`): khởi động lại toàn bộ Nav2, đặt lại 2D Pose Estimate về đúng điểm xuất phát, gửi goal bằng `send_goal_and_time.py`, ghi lại:
   ```bash
   ros2 launch atlas_slam navigation.launch.py controller:=dwb map:=$(pwd)/src/atlas_slam/maps/maze_map.yaml
   # (đặt 2D Pose Estimate trong RViz, rồi:)
   ros2 run atlas_slam send_goal_and_time.py --goal_x <x> --goal_y <y>
   ```
   - Thời gian hoàn thành (in ra tự động bởi script).
   - Kết quả (`SUCCEEDED` hay lỗi gì).
   - Quan sát bằng mắt: có dừng khựng ở góc cua không, có đi sượt sát tường không, quỹ đạo (xem `/plan` so `/local_plan` nếu bật RViz) có mượt không.
3. Lặp lại cho `rpp` và `mppi`, **cùng toạ độ, cùng vị trí xuất phát**.
4. Viết bảng so sánh 3 dòng (controller / thời gian / mượt hay giật / ghi chú) + 1 đoạn nhận xét ngắn: controller nào hợp với `maze.sdf` nhất, vì sao.

## Gợi ý

- Baseline con người đã đo ở [bài tập Module 7](../module-07-teleoperation/04-bai-tap.md) — thêm vào bảng so sánh làm dòng thứ 4, câu hỏi thú vị cho báo cáo: *máy có nhanh hơn người không, có mượt hơn không?*
- MPPI có yếu tố ngẫu nhiên ([bài Local controller](03-local-controller.md)) — chạy lại 2-3 lần, ghi khoảng dao động thời gian thay vì chỉ 1 số, nhận xét mức độ ổn định giữa các lần chạy so với DWB/RPP (tất định, luôn ra cùng kết quả với cùng input).
- Nếu 1 controller nào đó liên tục thất bại (không tới được goal) — đừng vội coi là "controller tệ", kiểm tra lại goal có nằm trong vùng đã quét bản đồ không, costmap có đang dính vật cản ảo không ([bài Costmap](01-costmap.md)) trước khi kết luận.

## Tự kiểm tra

- [ ] Có bảng số liệu đủ 3 controller, cùng 1 goal, cùng điều kiện xuất phát.
- [ ] Nhận xét dựa trên dữ liệu thật vừa đo, không chỉ lặp lại lý thuyết ở [bài Local controller](03-local-controller.md).
- [ ] Giải thích được (không chỉ mô tả) vì sao controller "thắng" lại thắng — liên hệ tới cơ chế thật của nó.

## Tự kiểm tra trước khi qua Module 11

- [ ] Vẽ được (nói bằng lời) đường đi dữ liệu: costmap → global planner → `/plan` → local controller → `/cmd_vel`.
- [ ] Giải thích được vì sao local costmap dùng frame `odom`, global costmap dùng frame `map`.
- [ ] Phát hiện được 1 cấu hình MPPI không khớp giới hạn `ros2_control` chỉ bằng cách đọc 2 file YAML, không cần chạy thử.
- [ ] Gửi được goal bằng cả 3 cách (RViz, CLI, code) mà không cần mở lại tài liệu.

Xong hết → sang **Module 11 — Recovery behaviors & behavior tree**, nơi xử lý đúng những lần robot KHÔNG tới được goal mà bạn vừa gặp ở bài tập này *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 10 được duyệt).*
