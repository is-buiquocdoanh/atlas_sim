# 05. Kế hoạch triển khai (Implementation Roadmap)

Đây là roadmap xây dựng **chính dự án này** (không phải nội dung robot học được) — thứ tự công việc để đi từ ý tưởng hiện tại đến một khóa học hoàn chỉnh, publish được.

## Nguyên tắc: xây dự án trước, viết bài học sau

Không viết tài liệu Module 3 (URDF) khi chưa có URDF thật chạy được — nếu không, dễ viết ra hướng dẫn không khớp thực tế khi code thay đổi. Thứ tự đúng cho **mỗi module**:

1. Tự code phần đó cho robot Atlas → chạy thử, chắc chắn hoạt động đúng.
2. Viết lại thành các bước tường thuật (tutorial) dựa trên chính quá trình vừa làm — đây cũng là lúc phát hiện bước nào "hiển nhiên với người viết nhưng khó với người mới" cần giải thích thêm.
3. Nhờ 1 người "mới" (chưa biết ROS) làm theo tài liệu, ghi lại chỗ nào họ bị vướng → sửa tài liệu.

## Giai đoạn A — Xây dự án lõi (MVP kỹ thuật)

Mục tiêu: robot Atlas chạy được toàn bộ end-to-end (SLAM → Nav2 → waypoint) *trước khi* viết một dòng tài liệu bài học nào, để đảm bảo lộ trình ở [02](02-lo-trinh-khoa-hoc.md) là khả thi trên thực tế, không phải lý thuyết suông.

- [ ] Khởi tạo workspace theo cấu trúc ở [01](01-cau-truc-workspace.md).
- [ ] `atlas_description`: URDF/XACRO robot diff-drive hoàn chỉnh (2 bánh + caster + LiDAR + IMU mount), hiển thị đúng trong RViz.
- [ ] `atlas_gazebo` + `atlas_control`: robot spawn được trong Gazebo Fortress, di chuyển được bằng `/cmd_vel`, `/odom` đúng.
- [ ] Cảm biến LiDAR + IMU publish dữ liệu đúng, TF đầy đủ, không lỗi trong `rviz2`.
- [ ] World "maze" đơn giản cho SLAM/Nav2 demo.
- [ ] `slam_toolbox` chạy được, tạo map lưu ra `.pgm`/`.yaml`.
- [ ] `nav2_params.yaml` tune cơ bản, robot tự đi 1 goal không đâm vật cản.
- [ ] `nav2_simple_commander` demo waypoint patrol chạy ổn định (không crash sau nhiều vòng lặp).
- [ ] Dockerfile/devcontainer để môi trường cài đặt tái lập được 1 lệnh.

→ Khi giai đoạn này xong, coi như đã có "đáp án" cho toàn bộ Module 0-12 — viết tài liệu sau đó là việc tường thuật lại, rủi ro thấp hơn nhiều.

## Giai đoạn B — Viết tài liệu bài học

- [ ] Viết Module 0-2 (nền tảng ROS 2) — phần này ít phụ thuộc vào code Atlas cụ thể, có thể viết song song Giai đoạn A.
- [ ] Viết Module 3-7 (mô phỏng) — bám sát đúng những gì đã làm ở Giai đoạn A, kèm ảnh chụp/GIF minh họa từng bước.
- [ ] Viết Module 8-12 (Nav2) — đây là phần "Hiểu vì sao" cần đầu tư nhiều nhất vì là USP của khóa học so với tutorial chỉ dạy "làm được".
- [ ] Viết Module 13 (capstone) + rubric.
- [ ] Review chéo: đọc lại toàn bộ, đảm bảo thuật ngữ nhất quán (xem Phụ lục D ở [02](02-lo-trinh-khoa-hoc.md)).

## Giai đoạn C — Pilot (thử nghiệm với người học thật)

- [ ] Tìm 2-3 người học thử (ưu tiên đúng persona: 1 người mới hoàn toàn, 1 sinh viên năm cuối) — cho làm theo tài liệu từ đầu, không hỗ trợ trực tiếp trừ khi họ bị kẹt hoàn toàn.
- [ ] Ghi lại: module nào mất nhiều thời gian hơn ước tính, bước nào gây lỗi phổ biến, câu hỏi nào lặp lại nhiều lần.
- [ ] Sửa tài liệu + có thể thêm mục "Lỗi thường gặp" (troubleshooting) ở cuối mỗi module dựa trên dữ liệu pilot thật, thay vì đoán trước.

## Giai đoạn D — Publish & mở rộng

- [ ] Public hóa repo (nếu định làm khóa học miễn phí/mở) hoặc chuẩn bị nền tảng phân phối (nếu định bán — cần quay lại làm rõ mô hình: bán trên nền tảng có sẵn như Udemy/F8/TekAcademy, hay tự host).
- [ ] Cân nhắc thêm Phụ lục A (robot thật) nếu có nhu cầu/tài nguyên phần cứng — đây là điểm mở rộng tự nhiên sang các dự án robot khác của bạn (atlas_robot, atlas_a2, atlas_c1...).
- [ ] Thu thập feedback liên tục, theo dõi mốc EOL của Humble (5/2027) — lên kế hoạch nâng cấp toàn bộ tài liệu + Docker image sang distro LTS kế tiếp (Jazzy hoặc bản mới hơn tùy thời điểm) trước khi Humble hết hạn, tránh khóa học "chết theo" distro.

## Lưu ý về phạm vi

Danh sách trên **cố tình không có mốc thời gian cụ thể** (tuần/tháng) vì phụ thuộc vào việc đây là dự án làm full-time, bán thời gian, hay có cộng sự hỗ trợ. Khi bắt đầu triển khai thực tế, nên chốt lại thời gian cho riêng Giai đoạn A trước — đây là phần quyết định tính khả thi của toàn bộ dự án, các giai đoạn sau chỉ là tường thuật lại và kiểm thử.
