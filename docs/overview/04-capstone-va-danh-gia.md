# 04. Capstone & đánh giá (Capstone Project & Assessment)

## Ý tưởng đồ án cuối khóa

**Chủ đề gợi ý: "Atlas Delivery" — robot giao hàng tự động trong kho mô phỏng.**

Lý do chọn chủ đề này:
- Tích hợp **toàn bộ** stack đã học (SLAM → map → localization → Nav2 → waypoint app) trong một kịch bản có ý nghĩa thực tế, không phải bài tập rời rạc.
- Đề tài "robot giao hàng/tuần tra tự động trong kho/nhà xưởng" là dạng đề tài **rất phổ biến trong đồ án tốt nghiệp ngành Cơ điện tử/Tự động hóa/CNTT tại Việt Nam** — sinh viên có thể dùng gần như nguyên bản làm báo cáo, chỉ cần thêm phần lý thuyết và biến thể riêng.
- Đủ mở để phân hóa độ khó: học viên yếu làm được bản tối thiểu (đi 1 điểm), học viên giỏi mở rộng (nhiều điểm, tránh vật cản động, tối ưu thời gian).

## Yêu cầu chức năng tối thiểu (bắt buộc)

1. Robot Atlas tự vẽ được bản đồ world "warehouse"/"maze" bằng SLAM (Module 8).
2. Load bản đồ, robot tự định vị đúng bằng AMCL (Module 9).
3. Robot nhận danh sách ≥ 3 điểm giao hàng (waypoint), tự động đi lần lượt qua từng điểm bằng Nav2 (Module 10, 12).
4. Robot tự né được vật cản tĩnh không có trong bản đồ gốc (đặt thêm hộp mô phỏng hàng hóa) — kiểm tra costmap + inflation hoạt động đúng.
5. Có log/report: tổng thời gian, quãng đường, số lần phải recovery (spin/backup).

## Mở rộng tùy chọn (cho học viên khá/giỏi, cộng điểm)

- Vật cản **động** (một actor/robot khác di chuyển trong world) — kiểm tra local costmap cập nhật theo thời gian thực.
- Tối ưu **thứ tự** ghé các điểm giao hàng (bài toán kiểu TSP đơn giản) trước khi gửi cho Nav2 — mở rộng sang thuật toán tối ưu, không chỉ ROS.
- Giao diện đơn giản (web dashboard hoặc RViz panel tùy chỉnh) để nhập điểm giao hàng thay vì hard-code trong script.
- So sánh định lượng 2 bộ controller (DWB vs MPPI) trên cùng kịch bản, đưa ra khuyến nghị — phần này rất hợp để làm chương "kết quả thực nghiệm" trong báo cáo tốt nghiệp.

## Tiêu chí đánh giá đề xuất (rubric)

| Tiêu chí | Trọng số | Mô tả |
|---|---|---|
| Chạy được end-to-end | 30% | SLAM → map → Nav2 → giao đủ các điểm, không crash |
| Chất lượng code | 20% | Package tách hợp lý, launch file dùng lại được, có comment/README |
| Hiểu lý thuyết | 25% | Giải thích được vì sao chọn planner/controller này, đọc hiểu costmap/BT — có thể chấm qua phỏng vấn ngắn hoặc câu hỏi viết |
| Mở rộng/sáng tạo | 15% | Có làm thêm phần tùy chọn ở trên hoặc biến thể riêng |
| Báo cáo/trình bày | 10% | Video demo + báo cáo ngắn (kiến trúc hệ thống, kết quả, hạn chế) |

## Chứng chỉ / ghi nhận hoàn thành

Vì định dạng chính là docs + code (không phải nền tảng LMS có sẵn), đề xuất đơn giản:
- Một **checklist hoàn thành** (`PROGRESS.md`) học viên tick từng module, có thể dùng GitHub Issues/Projects nếu học theo nhóm hoặc lớp.
- File `capstone/README.md` mẫu để học viên nộp bài theo đúng format thống nhất (mục tiêu, kiến trúc, cách chạy, kết quả, video demo) — dễ cho giảng viên chấm nhanh và cũng chính là khung sẵn cho chương báo cáo đồ án tốt nghiệp.
- Nếu sau này phát triển thành khóa học có bán (xem [05](05-ke-hoach-trien-khai.md)), có thể cấp chứng chỉ hoàn thành dựa trên việc nộp capstone đạt rubric trên — không cần xây hệ thống LMS phức tạp ngay từ đầu.
