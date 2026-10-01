# Module 6 — Cảm biến: LiDAR & IMU

*Giai đoạn 2: Mô phỏng robot Atlas. Xem vị trí module này trong lộ trình đầy đủ ở [02-lo-trinh-khoa-hoc.md](../../overview/02-lo-trinh-khoa-hoc.md). Trước module này cần xong [Module 5](../module-05-ros2-control/00-gioi-thieu.md) — robot phải chạy được thì mới lái đi thu thập dữ liệu cảm biến được.*

**Thời lượng ước tính**: 4-5 giờ.

## Cách đọc module này

| # | File | Khái niệm |
|---|------|-----------|
| 1 | [01-sensor-trong-gazebo.md](01-sensor-trong-gazebo.md) | Khai `<sensor>` cho gz-sim, 4 chặng dữ liệu đi qua |
| 2 | [02-laserscan.md](02-laserscan.md) | `sensor_msgs/LaserScan` — ý nghĩa từng field |
| 3 | [03-imu.md](03-imu.md) | `sensor_msgs/Imu` — orientation, gyro, accel, covariance |
| 4 | [04-frame-cam-bien.md](04-frame-cam-bien.md) | `frame_id`, `gz_frame_id`, vì sao TF sai làm hỏng mọi thứ |
| 5 | [05-xem-va-debug.md](05-xem-va-debug.md) | RViz, CLI, quy trình chẩn đoán khi không có dữ liệu |
| 6 | [06-bai-tap.md](06-bai-tap.md) | Bài tập: đo vật cản + debug ngược khi TF lệch |

Mỗi file theo khuôn quen thuộc: Định nghĩa → Cơ chế → Ví dụ trong dự án Atlas → Thử ngay.

## Mục tiêu chung của module

Robot Atlas **nhìn thấy** môi trường: `/scan` phản ánh đúng khoảng cách tới vật cản, `/imu` phản ánh đúng chuyển động quay. Đọc được từng field của `LaserScan` đủ để tự viết node xử lý. Và quan trọng nhất — hiểu vì sao **dữ liệu đúng + TF sai = hệ thống sai**, vì đó là lỗi sẽ quay lại ám bạn ở Module 8 và 10.

Sau module này, robot có đủ mọi thứ để bắt đầu tự chủ: di chuyển được, biết mình đi được bao xa, và thấy được xung quanh. Còn [Module 7](../module-07-teleoperation/00-gioi-thieu.md) (lái tay + RViz) trước khi hết Giai đoạn 2.

## Chuẩn bị

```bash
cd ~/atlas_sim
source install/setup.bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
```

Terminal thứ hai:
```bash
ros2 topic hz /scan     # ~10 Hz
ros2 topic hz /imu      # ~100 Hz
```
Cả hai có số liệu → sẵn sàng. Một trong hai im lặng → sang thẳng [bài 5](05-xem-va-debug.md), mục quy trình chẩn đoán.
