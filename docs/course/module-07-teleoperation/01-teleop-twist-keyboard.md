# 1. `teleop_twist_keyboard`

*[← Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Cấu hình RViz →](02-cau-hinh-rviz.md)*

## Định nghĩa

`teleop_twist_keyboard` là gói chuẩn của ROS 2 (không phải code riêng của Atlas): đọc phím bấm từ terminal, publish `geometry_msgs/msg/Twist` lên topic `cmd_vel`. Không phải cài thêm gì — có sẵn từ `ros-humble-teleop-twist-keyboard` (đã liệt kê ở Module 0).

## Cơ chế

Mỗi phím ứng với 1 kiểu chuyển động: `i`/`,` tiến/lùi, `j`/`l` quay trái/phải tại chỗ, `u`/`o`/`m`/`.` các hướng chéo, `k` dừng khẩn cấp. `q`/`z` tăng/giảm tốc độ tuyến tính + góc cùng lúc, `w`/`x` chỉ đổi tốc độ tuyến tính, `e`/`c` chỉ đổi tốc độ góc.

Node này publish **liên tục khi giữ phím, dừng publish khi buông** — không có cơ chế "khóa vận tốc cuối". Một số phiên bản terminal/driver không gửi sự kiện "buông phím" đúng cách → robot "trôi" dù không bấm gì. Biết trước điều này để không nghi oan `diff_drive_controller` (Module 5) khi gặp.

**Phải chạy bằng `ros2 run`, không phải `ros2 launch`.** `ros2 launch` không đảm bảo forward input bàn phím vào tiến trình con (thiếu TTY thật) — node khởi động nhưng không đọc được phím nào. Đây là lỗi hay gặp nhất của cả bài: tưởng robot hỏng, thực ra chỉ do chọn sai lệnh chạy.

## Ví dụ trong dự án Atlas

`teleop_twist_keyboard` publish thẳng vào `/cmd_vel` — đúng topic `diff_drive_controller` (Module 5) đang lắng nghe, nên chạy được ngay không cần remap gì. Nhưng chính vì publish THẲNG (không qua `twist_mux`), nó **sẽ đụng độ** với bất kỳ nguồn `cmd_vel` nào khác đang chạy cùng lúc (Nav2, joystick) — lý do [bài twist_mux](03-twist-mux.md) tồn tại.

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```
```bash
ros2 topic echo /cmd_vel     # terminal thứ ba, xem Twist thật được publish khi bấm phím
```
Thử bấm `q` vài lần (tăng tốc độ), quan sát giá trị `linear.x` publish ra tăng theo — xác nhận scale tốc độ đang đổi thật, không chỉ hiện trên terminal.

---
*Tiếp theo: [Cấu hình RViz →](02-cau-hinh-rviz.md)*
