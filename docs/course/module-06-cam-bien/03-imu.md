# 3. `sensor_msgs/Imu`

*[← LaserScan](02-laserscan.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Frame cảm biến →](04-frame-cam-bien.md)*

## Định nghĩa

**IMU** (Inertial Measurement Unit) đo **chuyển động của chính nó**, không đo môi trường. Ba nhóm dữ liệu trong một message:

```
std_msgs/Header header
geometry_msgs/Quaternion orientation          # hướng tuyệt đối
float64[9] orientation_covariance
geometry_msgs/Vector3 angular_velocity        # tốc độ quay (rad/s) -- con quay hồi chuyển
float64[9] angular_velocity_covariance
geometry_msgs/Vector3 linear_acceleration     # gia tốc (m/s²) -- gia tốc kế
float64[9] linear_acceleration_covariance
```

## Cơ chế

**`angular_velocity`** là dữ liệu đáng tin nhất và hữu ích nhất cho robot mặt đất. `angular_velocity.z` = tốc độ quay quanh trục đứng — chính là `ω` mà robot đang thực hiện, đo **độc lập hoàn toàn** với encoder. Đó là lý do IMU cứu được odometry khi bánh xe trượt: encoder tưởng robot quay, IMU nói không.

**`linear_acceleration` luôn bao gồm trọng lực.** Robot đứng yên trên sàn phẳng đọc ra `z ≈ +9,81`, không phải 0. Node xử lý phải trừ trọng lực ra (`imu0_remove_gravitational_acceleration` trong `robot_localization`). Đây là chỗ gây bối rối nhiều nhất khi mới đọc dữ liệu IMU.

**`orientation` không phải lúc nào cũng có.** IMU 6 trục (gia tốc + con quay) *không* biết hướng tuyệt đối — yaw của nó trôi và không có gì tham chiếu. Chỉ IMU 9 trục (thêm từ kế) hoặc IMU có bộ lọc tích hợp mới cho quaternion tin được. Quy ước: nếu không có orientation, driver đặt `orientation_covariance[0] = -1` để báo "đừng dùng field này".

**Covariance** là mức tin cậy, cho các bộ lọc phía sau. Giá trị `-1` ở phần tử đầu của một ma trận nghĩa là **toàn bộ nhóm dữ liệu đó không dùng được**.

Tất cả tuân theo REP-103: x trước, y trái, z lên. IMU thật hay gắn lệch trục so với quy ước này — lúc đó `imu_link` trong URDF phải xoay đúng bằng `rpy`, chứ không sửa số trong code.

## Ví dụ trong dự án Atlas

```xml
<sensor name="imu_sensor" type="imu">
  <always_on>true</always_on>
  <update_rate>100</update_rate>
  <topic>imu</topic>
  <gz_frame_id>imu_link</gz_frame_id>
</sensor>
```

IMU mô phỏng của gz-sim **cho sẵn cả orientation**, vì nó đọc thẳng trạng thái động lực học của link — nó "biết" hướng thật của robot trong world. Đây là điểm mô phỏng **dễ hơn thực tế**: IMU rẻ tiền trên robot thật không có thông tin đó. Nhớ điều này khi chuyển sang phần cứng, nếu không sẽ ngạc nhiên vì sao code chạy ngon trong sim lại hỏng ngoài đời.

IMU đặt sát tâm robot (`<origin xyz="0 0 ${imu_size / 2}"/>`, [Module 3 bài 6](../module-03-urdf-xacro/06-doc-urdf-atlas.md)) để phép đo ít bị nhiễu bởi gia tốc hướng tâm khi robot xoay.

**Hiện tại Atlas chưa thực sự dùng `/imu`.** SLAM ở Module 8 chạy bằng `/scan` + odometry bánh xe; Nav2 ở Module 10 cũng vậy. IMU có mặt để:
- Học cách đọc và kiểm chứng dữ liệu quán tính.
- Sẵn sàng cho `robot_localization` khi lên robot thật, nơi odometry bánh xe trôi nhiều hơn hẳn.

Cách hợp nhất IMU + encoder bằng EKF nằm ở [sổ tay robot thật](../../reference/robot-that-esp32-ros2-control.md#9-ekf-với-robot_localization) — ngoài phạm vi khóa học, nhưng đọc được ngay nếu bạn định làm đồ án trên phần cứng.

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
ros2 topic echo /imu --once
```

**Bốn phép kiểm chứng**, làm lần lượt — mỗi phép xác nhận một field:

```bash
# 1. Đứng yên: gia tốc z ~ +9.81, mọi vận tốc góc ~ 0
ros2 topic echo /imu --once | grep -A4 linear_acceleration

# 2. Quay trái: angular_velocity.z phải DƯƠNG và khớp lệnh
ros2 topic pub -r 10 /cmd_vel geometry_msgs/msg/Twist "{angular: {z: 0.5}}"
ros2 topic echo /imu --once | grep -A4 angular_velocity     # z ~ +0.5

# 3. Quay phải: z phải ÂM
ros2 topic pub -r 10 /cmd_vel geometry_msgs/msg/Twist "{angular: {z: -0.5}}"

# 4. Tăng tốc đột ngột: linear_acceleration.x tăng vọt rồi về ~0 khi đạt tốc độ ổn định
ros2 topic pub --once /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5}}"
```

Phép 2 và 3 là bài kiểm tra REP-103 trực tiếp: nếu dấu ngược lại, IMU đang gắn sai trục.

**So IMU với encoder** — thí nghiệm cho thấy giá trị thật của IMU:
```bash
# terminal A
ros2 topic echo /odom --field twist.twist.angular.z
# terminal B
ros2 topic echo /imu --field angular_velocity.z
```
Cho robot quay tại chỗ, hai số phải gần bằng nhau. Chúng đo **cùng một đại lượng bằng hai cơ chế độc lập** — đó chính là thứ EKF khai thác để phát hiện trượt bánh.

---
*Tiếp theo: [Frame cảm biến →](04-frame-cam-bien.md)*
