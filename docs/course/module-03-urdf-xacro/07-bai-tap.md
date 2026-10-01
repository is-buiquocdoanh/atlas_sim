# 7. Bài tập: tham số hóa kích thước robot

*[← Đọc URDF Atlas](06-doc-urdf-atlas.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Link](02-link.md), [Joint](03-joint.md), [XACRO](04-xacro.md), [robot_state_publisher](05-robot-state-publisher.md).

Mục tiêu của bài: chứng minh bằng tay rằng **đổi hình dạng robot chỉ cần đổi property**, và nhận ra chỗ nào trong hệ thống sẽ "đau" khi kích thước thay đổi — điều sẽ quay lại rất cụ thể ở Module 5 (odometry) và Module 10 (costmap).

## Phần A — đổi tham số, quan sát hệ quả

Mở `src/atlas_description/urdf/atlas.urdf.xacro`, lần lượt thử từng thay đổi, mỗi lần chạy lại:
```bash
colcon build --packages-select atlas_description && source install/setup.bash
ros2 launch atlas_description display.launch.py
```

1. `wheel_radius`: `0.05` → `0.10`. Robot cao lên, **và vẫn chạm đất đúng**. Giải thích: `wheel_radius` chảy sang những chỗ nào? (gợi ý: [bài 4](04-xacro.md), 3 chỗ).
2. `wheel_separation`: `0.30` → `0.45`. Bánh xe dang rộng ra — nhưng chú ý bánh giờ **lòi ra ngoài khung** vì `base_width` vẫn `0.24`. Không có gì trong URDF ngăn chuyện đó: URDF mô tả, không kiểm tra hợp lý.
3. `base_length`: `0.30` → `0.50`. Quan sát 2 caster **tự dịch ra xa nhau** mà bạn không sửa gì thêm — vì `x_offset` của chúng tính từ `base_length`.
4. Đổi `base_height` và xem LiDAR có còn nằm đúng trên nóc không. Vì sao?

Sau mỗi thay đổi, kiểm tra bằng số chứ không chỉ bằng mắt:
```bash
ros2 run tf2_ros tf2_echo base_footprint base_link     # phải bằng wheel_radius mới
ros2 run tf2_ros tf2_echo base_link left_wheel_link    # y phải bằng wheel_separation/2
```

## Phần B — thêm một tham số mới

Hiện `lidar_x_offset` là hằng số `0.05`. Hãy sửa để LiDAR **luôn nằm ở 1/4 chiều dài khung tính từ mũi robot**, tự khớp lại khi `base_length` đổi — tức là thay giá trị cố định bằng một biểu thức tính từ `base_length`.

Tự kiểm tra: đổi `base_length` qua 2-3 giá trị khác nhau, mỗi lần chạy `tf2_echo base_link lidar_link` và xác nhận x thay đổi theo đúng tỉ lệ mong muốn.

## Phần C — gây lỗi có chủ đích (bài debug ngược)

Mỗi trường hợp, đoán **trước** triệu chứng rồi mới chạy, ghi lại thông báo lỗi:

| Thay đổi | Đoán xem hỏng thế nào |
|---|---|
| Đổi `<parent link="base_link"/>` của `lidar_joint` thành `<parent link="lidar_link"/>` | URDF còn là cây không? |
| Thêm joint thứ hai cũng có `<child link="imu_link"/>` | 1 link mấy cha? ([Module 2](../module-02-tf2-toa-do/02-tf-tree.md)) |
| Xóa `<axis>` của `left_wheel_joint` | bánh quay quanh trục nào? |
| Viết `${wheel_radius * }` (biểu thức thiếu vế) | lỗi xuất hiện ở bước nào, trước hay sau khi ROS khởi động? |

Với mỗi lỗi, xác định công cụ nào phát hiện nhanh nhất: `xacro`, `check_urdf`, hay phải mở RViz mới thấy. Đây là phản xạ sẽ dùng suốt các module sau.

```bash
git checkout src/atlas_description/urdf/   # trả lại nguyên trạng khi xong
```

## Nộp bài

- Ảnh chụp RViz với robot ở kích thước gốc và ở kích thước đã đổi (phần A).
- Đoạn xacro của phần B + output `tf2_echo` chứng minh nó tự khớp.
- Bảng phần C: mỗi lỗi → triệu chứng thực tế → công cụ phát hiện.

## Tự kiểm tra trước khi qua Module 4

- [ ] Giải thích được khác nhau giữa `<visual>`, `<collision>`, `<inertial>` và cái nào ảnh hưởng tới cái gì.
- [ ] Chọn đúng loại joint cho 1 bộ phận robot bất kỳ khi nghe mô tả bằng lời (bánh xe, khớp tay máy, cảm biến, cột nâng).
- [ ] Nói được `<origin>` của joint đặt ở đâu và nó dời cái gì (link cha hay link con).
- [ ] Viết được 1 macro xacro có tham số và giải thích vì sao `sensors.xacro` phải bọc trong macro.
- [ ] Vẽ lại được sơ đồ `xacro → robot_description → robot_state_publisher → /tf`, và chỉ ra `/joint_states` đến từ đâu trong từng ngữ cảnh.
- [ ] Biết dùng `xacro`, `check_urdf`, `view_frames`, `tf2_echo` để tìm lỗi URDF mà không cần đoán.

Xong hết → sang [**Module 4 — Đưa robot vào Gazebo**](../module-04-gazebo/00-gioi-thieu.md), nơi `<collision>` và `<inertial>` viết ở module này lần đầu tiên có hậu quả thật.
