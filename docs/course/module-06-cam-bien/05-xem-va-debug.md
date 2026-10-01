# 5. Xem dữ liệu và chẩn đoán khi không có dữ liệu

*[← Frame cảm biến](04-frame-cam-bien.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](06-bai-tap.md)*

## Định nghĩa

Ba cách nhìn dữ liệu cảm biến, mỗi cách trả lời một câu hỏi khác nhau — dùng sai cách là đi tìm lỗi nhầm chỗ:

| Công cụ | Trả lời câu hỏi |
|---|---|
| `ros2 topic echo` / `hz` | **Có dữ liệu không? Đúng số không?** |
| **RViz** | **Dữ liệu có nằm đúng chỗ không?** (tức TF có đúng không) |
| Panel Visualize Lidar trong Gazebo | **Bản thân cảm biến có quét đúng không?** |

## Cơ chế

**CLI** — nhanh, dùng để trả lời câu hỏi có/không:
```bash
ros2 topic hz /scan                     # tần số thật so với update_rate
ros2 topic echo /scan --once --no-arr   # metadata, bỏ mảng 360 phần tử
ros2 topic echo /scan --field ranges[0] # một phần tử cụ thể
ros2 topic info /scan --verbose         # ai publish, ai subscribe, QoS
```

**RViz** — cấu hình tối thiểu để kiểm tra cảm biến:

| Mục | Giá trị | Vì sao |
|---|---|---|
| Fixed Frame | `odom` | Thấy được cả robot di chuyển lẫn dữ liệu quét |
| `RobotModel` | — | Để đối chiếu vị trí quét với thân robot |
| `TF` | — | Nhìn thấy `lidar_link` nằm đâu |
| `LaserScan` | topic `/scan`, Size 0.03-0.05 | Điểm mặc định quá nhỏ, khó nhìn |
| `Odometry` | topic `/odom`, Keep 100 | Xem vệt đường robot đã đi |

Mẹo RViz: đặt `Decay Time` của `LaserScan` lên 5-10 giây để các vòng quét cũ còn lưu lại — nhìn ra hình dạng căn phòng ngay, và đây là bản xem trước của thứ SLAM sắp làm ở Module 8.

**Panel Visualize Lidar trong Gazebo** — đã khai sẵn trong world của Atlas ([Module 4 bài 3](../module-04-gazebo/03-world-file.md)). Nó vẽ tia laser thật trong không gian 3D. Nếu tia trong Gazebo trúng tường mà điểm trong RViz lại lệch, thì lỗi chắc chắn ở TF chứ không ở cảm biến.

## Quy trình chẩn đoán: "không thấy `/scan`"

Chạy theo đúng thứ tự này, mỗi bước loại trừ một chặng ([bài 1](01-sensor-trong-gazebo.md)):

```bash
# B1. Gazebo có sinh ra dữ liệu không? (máy dùng Fortress bản `ign` thì đổi gz -> ign)
gz topic -l | grep scan
```
- **Không có** → lỗi ở chặng 1-2. Kiểm tra: `<sensor>` có trong xacro không (`xacro ... | grep -A3 sensor`), world có `gz-sim-sensors-system` không, mô phỏng có đang pause không (`ros2 topic echo /clock --once`).
- **Có** → đi tiếp.

```bash
# B2. Bridge có đưa sang ROS không?
ros2 topic list | grep scan
```
- **Không có** → lỗi ở chặng 4. Kiểm tra `gz_bridge.yaml` có khối `/scan`, node bridge có chạy không (`ros2 node list | grep bridge`), tên topic 2 bên có khớp không.
- **Có** → đi tiếp.

```bash
# B3. Có dữ liệu chảy thật không?
ros2 topic hz /scan
```
- **Im lặng** → thường là sai `direction` trong bridge (`GZ_TO_ROS` cho cảm biến), hoặc lệch QoS.
- **Có ~10 Hz** → dữ liệu ổn, vấn đề nằm ở TF → sang B4.

```bash
# B4. TF có đúng không?
ros2 topic echo /scan --once --no-arr | grep frame_id
ros2 run tf2_ros tf2_echo base_link lidar_link
```

Bốn bước này áp dụng y nguyên cho `/imu`, chỉ đổi tên topic.

## Ví dụ trong dự án Atlas

Bảng triệu chứng → nguyên nhân, gom từ những lỗi thực sự hay gặp với repo này:

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `/scan` im lặng hoàn toàn | Thiếu `gz-sim-sensors-system`, hoặc Gazebo đang pause |
| `gz topic -l` có nhưng `ros2 topic list` không | Thiếu khối bridge trong `gz_bridge.yaml` |
| Topic tồn tại, `hz` không ra số | Sai `direction` trong bridge |
| RViz báo "No transform from [lidar_link]" | `gz_frame_id` không trùng tên link trong URDF |
| Điểm quét lệch khỏi tường một khoảng cố định | TF `lidar_link` sai vị trí ([bài 4](04-frame-cam-bien.md)) |
| Điểm quét đảo trái-phải | `rpy` của `lidar_joint` sai (LiDAR lật ngược) |
| `ranges` toàn `inf` | Robot ở giữa world trống, hoặc `range_max` quá nhỏ |
| `ranges` toàn 0 hoặc rất nhỏ | Đang đọc cả giá trị dưới `range_min`, chưa lọc |
| Không thấy tia laser trong Gazebo | Chọn robot/`lidar_link` trong Entity Tree để panel bind vào |
| `/scan` tần số thấp hơn 10 Hz nhiều | RTF thấp — máy không kịp mô phỏng, xem [Module 4](../module-04-gazebo/02-vat-ly-inertia.md) |

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
rviz2
```
Cấu hình RViz theo bảng ở trên, rồi lái robot bằng teleop:
```bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

Ba quan sát đáng làm khi đang lái:
1. Bật `Decay Time` = 10 s, lái vòng quanh mê cung → hình dạng căn phòng hiện dần ra. Đây gần như chính xác là thứ SLAM sẽ tạo ra, chỉ khác là SLAM còn sửa sai lệch tích lũy.
2. Lái sát tường rồi sát góc — quan sát vùng mù `range_min` 0,12 m: có một vòng trống quanh robot mà LiDAR không thấy gì.
3. Lái ra giữa khoảng trống lớn → nhiều tia thành `inf`, điểm biến mất khỏi RViz thay vì hiện ở khoảng cách 10 m. Đó là RViz đang lọc giúp bạn.

Lưu lại cấu hình RViz (`File → Save Config As`) — Module 7 sẽ cần đúng bộ display này.

---
*Tiếp theo: [Bài tập →](06-bai-tap.md)*
