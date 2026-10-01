# 4. Bài tập: lái hết mê cung, đo thời gian làm baseline

*[← twist_mux](03-twist-mux.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [teleop_twist_keyboard](01-teleop-twist-keyboard.md), [cấu hình RViz](02-cau-hinh-rviz.md).

## Yêu cầu

1. Chạy `atlas_bringup bringup.launch.py world:=maze.sdf`, mở RViz với đủ 4 display đã cấu hình ở [bài 2](02-cau-hinh-rviz.md).
2. Lái bằng bàn phím, đi từ vị trí xuất phát đến **hết các ngóc ngách** của `maze.sdf` (không chỉ đi 1 đường thẳng — mục tiêu là làm quen địa hình, lát nữa dùng lại ở Module 8 để vẽ bản đồ).
3. **Đo thời gian** từ lúc bắt đầu di chuyển tới lúc hoàn thành 1 vòng khép kín quay lại điểm xuất phát. Ghi lại số giây.
4. Ghi chú lại: đoạn nào khó lái nhất (cua gấp, hành lang hẹp), có đụng tường lần nào không.

## Vì sao bài này quan trọng (không chỉ là "lái cho vui")

Số liệu bạn vừa đo là **baseline con người** — ở Module 10, robot sẽ tự đi cùng quãng đường bằng Nav2 (DWB/RPP/MPPI), và bài tập so sánh 3 controller đó cần có một mốc để đối chiếu "máy có nhanh/mượt hơn người lái không". Không đo bây giờ, sau này không có gì để so sánh.

## Gợi ý

- Không cần lái đẹp — mục tiêu là số liệu THẬT, kể cả nếu bạn đụng tường 3 lần thì cứ ghi nhận 3 lần, đừng lái lại từ đầu để có số đẹp.
- Muốn đo thời gian chính xác không cần đồng hồ tay, dùng timestamp của chính ROS 2:
  ```bash
  ros2 topic echo /clock --once    # lúc bắt đầu, ghi sim time
  ros2 topic echo /clock --once    # lúc kết thúc, trừ ra
  ```

## Tự kiểm tra

- [ ] Đi hết mọi ngóc ngách của `maze.sdf`, không bỏ sót nhánh nào.
- [ ] Có số liệu thời gian cụ thể (không phải ước lượng).
- [ ] RViz hiển thị đúng cả 4 display trong suốt quá trình lái (không bị tắt/lỗi giữa chừng).

## Tự kiểm tra trước khi qua Module 8

- [ ] Giải thích được vì sao phải dùng `ros2 run` chứ không phải `ros2 launch` cho `teleop_twist_keyboard`.
- [ ] Tự cấu hình được RViz từ con số 0 (không mở lại file cũ) trong dưới 2 phút.
- [ ] Giải thích được `twist_mux` chọn nguồn nào khi 2 nguồn cùng publish, biết trước priority và timeout từng nguồn.
- [ ] Có số liệu baseline thời gian lái hết `maze.sdf` bằng tay, lưu lại để so Module 10.

Xong hết → **kết thúc Giai đoạn 2 (Mô phỏng robot Atlas)**. Sang **Giai đoạn 3 — Navigation2**, bắt đầu bằng **Module 8 — SLAM: tự vẽ bản đồ** *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 7 được duyệt).*
