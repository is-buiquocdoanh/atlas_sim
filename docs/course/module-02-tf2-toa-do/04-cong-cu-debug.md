# 4. Công cụ debug TF

*[← REP-103/REP-105](03-rep103-rep105.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](05-bai-tap.md)*

## Định nghĩa

3 công cụ dùng xuyên suốt mọi module sau khi làm việc với TF: **`static_transform_publisher`** (publish 1 transform tĩnh không cần viết code), **`view_frames`** (vẽ toàn bộ cây TF hiện tại ra file), **`tf2_echo`** (xem giá trị 1 transform theo thời gian thực).

## Cơ chế

**`static_transform_publisher`** — publish 1 lần lên `/tf_static`, hợp cho quan hệ **cố định vĩnh viễn** (vd cảm biến gắn cứng trên khung robot, không có joint chuyển động):
```bash
ros2 run tf2_ros static_transform_publisher \
  --x 1.0 --y 0.0 --z 0.5 --frame-id world --child-frame-id static_frame
```
Không cần viết `TransformBroadcaster` tay cho những trường hợp tĩnh đơn giản như thế này.

**`view_frames`** — nghe `/tf` + `/tf_static` trong 5 giây, xuất ra file PDF vẽ cây TF hiện có, kèm tần số publish từng frame (hữu ích để phát hiện frame nào "chết" — tần số 0 hoặc không xuất hiện trong cây):
```bash
ros2 run tf2_tools view_frames
```

**`tf2_echo`** — in giá trị transform giữa 2 frame CỤ THỂ, cập nhật liên tục, kể cả khi 2 frame không nối trực tiếp (tự tính qua tổ tiên chung):
```bash
ros2 run tf2_ros tf2_echo <frame_cha> <frame_con>
```

**RViz** — display `TF` (bật/tắt từng frame, xem trực quan trục XYZ) là cách trực quan nhất để "nhìn thấy" cây TF đang chuyển động, thay vì đọc số.

## Ví dụ trong bài học

```bash
ros2 launch ros2_basics demo_tf.launch.py
ros2 run tf2_tools view_frames                    # mở PDF vừa xuất ra, đối chiếu với images/tf-tree-example.svg
ros2 run tf2_ros tf2_echo world moving_frame       # số liệu đổi liên tục -- frame ĐỘNG
ros2 run tf2_ros tf2_echo world static_frame       # số liệu KHÔNG đổi -- frame TĨNH
```

## Ví dụ trong dự án Atlas

Từ Module 4 trở đi, đây là bộ lệnh đầu tiên chạy mỗi khi robot "không đứng đúng chỗ" trong RViz hay Nav2 báo lỗi TF:
```bash
ros2 run tf2_tools view_frames                     # cây TF thật của Atlas có đủ frame chưa?
ros2 run tf2_ros tf2_echo map base_link             # robot đang ở đâu trên bản đồ?
ros2 run tf2_ros tf2_echo odom base_link            # có đang trôi bất thường không?
```
Đã tự dùng `tf2_echo`/`view_frames` để debug thật trong quá trình xây `atlas_control`/`atlas_slam` (vd xác nhận `diff_drive_controller` có publish đúng `odom`→`base_footprint` hay không trước khi nghi ngờ tới AMCL) — đây không phải lệnh học cho biết, mà là công cụ dùng hàng ngày.

---
*Tiếp theo: [Bài tập →](05-bai-tap.md)*
