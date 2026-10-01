# 4. Bài tập: tự vẽ bản đồ `maze.sdf`

*[← Lưu bản đồ](03-luu-ban-do.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [SLAM là gì](01-slam-nguyen-ly.md), [slam_toolbox thực hành](02-slam-toolbox-thuc-hanh.md), [Lưu bản đồ](03-luu-ban-do.md).

## Yêu cầu

1. Chạy bringup + SLAM + teleop (xem [bài 2](02-slam-toolbox-thuc-hanh.md)), lái đi **hết mọi ngóc ngách** của `maze.sdf` — dùng lại chính lộ trình đã đi ở [bài tập Module 7](../module-07-teleoperation/04-bai-tap.md).
2. Lưu bản đồ ra **CẢ 2 định dạng** vào thư mục riêng (KHÔNG ghi đè `maze_map.*` có sẵn — dùng tên khác, vd `my_map`):
   ```bash
   ros2 run nav2_map_server map_saver_cli -f src/atlas_slam/maps/my_map
   ros2 service call /slam_toolbox/serialize_map slam_toolbox/srv/SerializePoseGraph \
     "{filename: '/đường/dẫn/tuyệt/đối/tới/src/atlas_slam/maps/my_map'}"
   ```
3. Mở `my_map.pgm`, so sánh bằng mắt với `src/atlas_gazebo/worlds/maze.sdf` (đọc tọa độ các `<model>` tường trong file SDF) — đối chiếu từng vách, trả lời:
   - Vách nào trong bản đồ bị "mờ"/đứt đoạn? Vì sao (gợi ý: bạn có lái sát và quét kỹ đoạn đó không, hay chỉ đi lướt qua)?
   - Góc nào bị "phồng" ra so với thật? Khả năng do sai số scan matching tích lũy chưa được loop closure sửa hết, hay do lái quá nhanh khiến scan bị méo?

## Gợi ý

- Bản đồ sẽ KHÔNG bao giờ trùng khít 100% với world gốc — có nhiễu cảm biến thật trong `atlas_gazebo.xacro` (`stddev: 0.01`, xem lại [Module 6](../module-06-cam-bien/02-laserscan.md)). Mục tiêu bài này là **giải thích được vì sao lệch**, không phải tạo ra bản đồ hoàn hảo.
- Lái CHẬM và ổn định ở các góc cua — scan matching cần 2 scan liên tiếp đủ chồng lấp để khớp đúng, lái quá nhanh qua góc cua dễ làm map "gãy khúc" ở đúng chỗ đó.

## Tự kiểm tra

- [ ] Có đủ 4 file (`.pgm`, `.yaml`, `.posegraph`, `.data`) cho `my_map`, cùng 1 phiên SLAM.
- [ ] Bản đồ thể hiện đủ hình dạng chữ Z của mê cung (không chỉ 1 đoạn, không bị "gãy" thành 2 mảnh rời).
- [ ] Trả lời được câu hỏi so sánh ở trên, có lý do cụ thể (không chỉ "nó bị lệch").

## Tự kiểm tra trước khi qua Module 9

- [ ] Giải thích được loop closure bằng lời, cho ví dụ cụ thể không phải ví dụ trong bài.
- [ ] Nói được vì sao world đối xứng nguy hiểm cho SLAM, dù đó không phải "lỗi code".
- [ ] Phân biệt được khi nào dùng `map_saver_cli`, khi nào dùng `serialize_map`, không cần tra lại.
- [ ] Đọc hiểu được `resolution`/`origin` trong file `.yaml` của bản đồ.

Xong hết → sang **Module 9 — Localization với AMCL**, nơi bản đồ `.pgm` bạn vừa tạo được dùng làm input thật *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 8 được duyệt).*
