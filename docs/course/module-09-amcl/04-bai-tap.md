# 4. Bài tập: đặt sai pose ban đầu, đo AMCL tự sửa bao lâu

*[← AMCL vs slam_toolbox](03-amcl-vs-slam-toolbox.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Particle Filter](01-particle-filter.md), [AMCL thực hành](02-amcl-thuc-hanh.md).

## Yêu cầu

1. Chạy bringup + Nav2 với AMCL (mặc định), KHÔNG đặt "2D Pose Estimate" đúng — cố tình đặt **lệch 1-1.5m** so với vị trí robot thật (vẫn trong world, không đặt xuyên tường).
2. Lái robot đi thẳng vài mét, quan sát đám mây hạt trong RViz.
3. Đo (ước lượng bằng mắt hoặc `ros2 topic echo /amcl_pose`) **quãng đường robot phải đi** trước khi hạt hội tụ đủ chặt quanh vị trí thật (không còn tỏa rộng).
4. Lặp lại với độ lệch khác: 0.3m (nhẹ), 1.5m (nặng), và lệch GÓC 90° (giữ đúng vị trí, chỉ sai hướng). So sánh 3 trường hợp: trường hợp nào hội tụ nhanh nhất, trường hợp nào có lúc KHÔNG hội tụ về đúng (particle filter "khóa" nhầm vào vị trí sai)?

## Gợi ý

- "Hội tụ" quan sát được rõ nhất khi robot đi qua chỗ có đặc trưng phân biệt (góc cua, ngã rẽ) — đi thẳng dọc hành lang dài không có gì khác biệt, particle filter khó phân biệt được "đang ở mét 2 hay mét 5" dù hướng đã đúng.
- Nếu hạt "khóa" nhầm (hội tụ nhưng SAI vị trí) — đây không phải lỗi, là giới hạn thật của particle filter khi world có 2 chỗ nhìn giống nhau qua LiDAR (liên hệ lại [bug đối xứng ở Module 8](../module-08-slam/01-slam-nguyen-ly.md) — cùng 1 nguyên nhân gốc: thiếu đặc trưng phân biệt).

## Tự kiểm tra

- [ ] Có số liệu quãng đường hội tụ cho cả 3 trường hợp (0.3m, 1.5m, lệch góc 90°).
- [ ] Giải thích được bằng particle filter (không chỉ "nó tự sửa") vì sao đi qua góc cua giúp hội tụ nhanh hơn đi thẳng.
- [ ] Nếu gặp trường hợp hội tụ sai, mô tả lại được đặc điểm vị trí gây nhầm lẫn.

## Tự kiểm tra trước khi qua Module 10

- [ ] Giải thích được 3 bước predict/update/resample của particle filter bằng lời của riêng bạn.
- [ ] Phân biệt rạch ròi AMCL và `slam_toolbox` localization: cái nào cần pose đúng ngay lúc khởi động, cái nào không, và vì sao.
- [ ] Giải thích được (không cần đọc lại code) vì sao panel Nav2 báo "Inactive" với `slam_toolbox` dù hệ thống chạy đúng.
- [ ] Đọc hiểu `/amcl_pose` — phân biệt được pose ước lượng và độ không chắc chắn (hiệp phương sai) trong cùng 1 message.

Xong hết → sang **Module 10 — Nav2 core: costmap, planner, controller** — module trọng tâm của khóa học, nơi robot bắt đầu **tự đi** chứ không chỉ biết mình đang ở đâu *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 9 được duyệt).*
