# 6. Bài tập: đo vật cản và debug ngược TF

*[← Xem & debug](05-xem-va-debug.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [LaserScan](02-laserscan.md), [IMU](03-imu.md), [Frame cảm biến](04-frame-cam-bien.md), [Xem & debug](05-xem-va-debug.md).

## Phần A — `/scan` có đo đúng không?

Dùng `my_world.sdf` bạn đã tạo ở [bài tập Module 4](../module-04-gazebo/06-bai-tap.md), hoặc thêm vật cản vào `empty.sdf`.

1. Đặt một hộp `0.4 × 0.4 × 0.5` tại `x = 1.5, y = 0` (thẳng trước mặt robot).
2. Spawn robot tại gốc, hướng mặc định.
3. Đo khoảng cách LiDAR báo về ở hướng 0°.

**Tính trước bằng tay** khoảng cách mong đợi, rồi mới so:
- Tâm hộp ở `x = 1,5`, hộp dày 0,4 m → mặt gần nhất ở `x = 1,3`.
- LiDAR đặt lệch trước 0,05 m so với `base_link`.
- Vậy `ranges` ở hướng 0° phải ≈ **?** m.

```bash
ros2 topic echo /scan --field ranges[0] --once
```
Sai lệch trong khoảng ±0,02 m là đạt (có nhiễu gaussian stddev 0,01 m đã cấu hình).

Làm thêm 2 vị trí khác nhau (vd `x = 0.5` và `x = 3.0`) và lập bảng: khoảng cách tính tay / đo được / sai lệch.

4. Đặt vật cản **xa hơn 10 m** → xác nhận `ranges` trả về `inf`, không phải một số lớn.
5. Đẩy robot sát vật cản (dưới 0,12 m) → xác nhận giá trị rơi vào vùng phải-bỏ-qua.

## Phần B — viết node đọc `/scan` đúng cách

Viết node Python in ra khoảng cách gần nhất và hướng của nó, **lọc đúng 3 giá trị đặc biệt** ([bài 2](02-laserscan.md)).

```python
# khung gợi ý -- tự hoàn thiện
valid = [(i, r) for i, r in enumerate(msg.ranges)
         if msg.range_min < r < msg.range_max]
if not valid:
    return
i, r = min(valid, key=lambda t: t[1])
goc_rad = msg.angle_min + i * msg.angle_increment
```

Yêu cầu:
- In ra khoảng cách (m) và góc (**độ**, không phải radian).
- Chạy được trong `maze.sdf` khi đang lái robot bằng teleop.
- Đặt trong package `ros2_basics` (đã có sẵn từ Module 1), thêm entry point trong `setup.py`.

Kiểm tra: lái robot sát tường bên trái → góc báo về phải ≈ +90°; sát tường bên phải → ≈ −90°.

**Câu hỏi**: nếu bỏ phần lọc và viết thẳng `min(msg.ranges)`, kết quả ra bao nhiêu? Vì sao?

## Phần C — debug ngược: TF LiDAR bị lệch

Đây là bài tập trọng tâm của module.

1. Trong `atlas_description/urdf/sensors.xacro`, đổi `lidar_joint` thành:
```xml
<origin xyz="0.35 0 0.14" rpy="0 0 0"/>
```
2. `colcon build --packages-select atlas_description && source install/setup.bash`
3. Chạy lại, mở RViz (Fixed Frame `odom`, có `RobotModel` + `TF` + `LaserScan`).

Trả lời:
- Điểm quét lệch khỏi tường bao nhiêu? Theo hướng nào?
- `ros2 topic echo /scan --field ranges[0]` có đổi so với trước không? **Vì sao?**
- `ros2 run tf2_ros tf2_echo base_link lidar_link` cho số gì?
- Nếu chỉ có CLI, không có RViz, bạn phát hiện lỗi này bằng cách nào?

4. Thử thêm biến thể: giữ nguyên vị trí nhưng đổi `rpy="0 0 3.14159"` (xoay LiDAR 180°). Mô tả hiện tượng — khác gì với trường hợp lệch vị trí?

```bash
git checkout src/atlas_description   # khôi phục
```

## Phần D — IMU

1. Robot đứng yên: ghi lại `linear_acceleration` cả 3 trục. Giải thích vì sao `z ≈ 9,81` chứ không phải 0.
2. Quay trái `ω = 0,5` rồi quay phải `ω = −0,5`: ghi `angular_velocity.z` cả 2 lần, xác nhận đúng dấu theo REP-103.
3. So `/imu` với `/odom` khi quay tại chỗ:
```bash
ros2 topic echo /odom --field twist.twist.angular.z
ros2 topic echo /imu --field angular_velocity.z
```
Hai số lệch nhau bao nhiêu? Con số này nói lên điều gì về việc hợp nhất 2 nguồn?
4. **Thí nghiệm trượt bánh**: đặt `mu1`/`mu2` của 2 bánh chủ động về `0.3` trong `atlas.gazebo.xacro`, ra lệnh quay nhanh. Lúc này encoder và IMU báo khác nhau như thế nào? Nguồn nào đúng?

## Nộp bài

- Bảng phần A: 3 vị trí vật cản, khoảng cách tính tay / đo được / sai lệch.
- Code node phần B + ảnh chụp output khi lái sát tường trái và phải.
- Phần C: ảnh chụp RViz trước/sau khi lệch TF, kèm trả lời 4 câu hỏi.
- Phần D: bảng số liệu 4 thí nghiệm + nhận xét về trượt bánh.

## Tự kiểm tra trước khi qua Module 7

- [ ] Kể được 4 chặng dữ liệu cảm biến đi qua và triệu chứng khi hỏng từng chặng.
- [ ] Tính được góc của `ranges[i]` bất kỳ mà không cần tra lại.
- [ ] Biết 3 giá trị đặc biệt trong `ranges[]` và cách lọc đúng.
- [ ] Giải thích được vì sao `linear_acceleration.z ≈ 9,81` khi robot đứng yên.
- [ ] Giải thích được vì sao `echo /scan` không phát hiện được lỗi TF lệch.
- [ ] Chạy được quy trình 4 bước chẩn đoán "không thấy `/scan`" mà không cần mở lại tài liệu.
- [ ] Cấu hình được RViz từ đầu với `RobotModel` + `TF` + `LaserScan` + `Odometry`.

Xong hết. Robot Atlas giờ có đủ: hình dạng (M3), vật lý (M4), khả năng di chuyển (M5), và giác quan (M6). Sang [**Module 7 — Teleoperation & RViz**](../module-07-teleoperation/00-gioi-thieu.md), module ngắn để thành thạo lái tay và dựng giao diện quan sát — module cuối thật sự của Giai đoạn 2, trước khi bước vào Giai đoạn 3 — Navigation2.
