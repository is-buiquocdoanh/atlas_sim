# 2. Hardware interface — thẻ `<ros2_control>` trong URDF

*[← ros2_control là gì](01-ros2-control-la-gi.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Controller & spawner →](03-controller-va-spawner.md)*

## Định nghĩa

**Hardware interface** là tầng dưới cùng: nó khai báo *robot này có những khớp nào, mỗi khớp nhận lệnh kiểu gì và báo về trạng thái gì*. Khai báo nằm ngay trong URDF, trong thẻ `<ros2_control>`.

Hai loại giao diện:
- **`command_interface`** — thứ ta **ghi xuống** khớp: `velocity`, `position`, hoặc `effort`.
- **`state_interface`** — thứ ta **đọc lên** từ khớp: `position`, `velocity`, `effort`.

## Cơ chế

```xml
<ros2_control name="atlas_system" type="system">
  <hardware>
    <plugin>gz_ros2_control/GazeboSimSystem</plugin>
  </hardware>
  <joint name="left_wheel_joint">
    <command_interface name="velocity">
      <param name="min">-10</param>
      <param name="max">10</param>
    </command_interface>
    <state_interface name="velocity"/>
    <state_interface name="position"/>
  </joint>
  ...
</ros2_control>
```

`<plugin>` là **điểm thay đổi duy nhất** khi chuyển mô phỏng ↔ robot thật:

| Môi trường | `<plugin>` | Thực chất làm gì |
|---|---|---|
| Gazebo (khóa học này) | `gz_ros2_control/GazeboSimSystem` | Đặt vận tốc khớp trong bộ giải vật lý |
| Robot thật | `my_robot/MyHardware` (tự viết) | Gửi lệnh xuống vi điều khiển, đọc encoder |
| Test không phần cứng | `mock_components/GenericSystem` | Giả lập: lệnh ghi xuống được trả về y nguyên |

Mọi thứ phía trên — controller, file config, Nav2 — **không biết và không cần biết** đang chạy cái nào.

Chỉ khai những khớp thực sự **được điều khiển**. Atlas có 7 joint nhưng chỉ 2 bánh xe xuất hiện ở đây; 5 joint còn lại là `fixed`, không có bậc tự do, không có gì để điều khiển hay đo.

Vì sao mỗi bánh cần **cả** `position` lẫn `velocity` trong `state_interface`, trong khi chỉ điều khiển bằng `velocity`?
- `velocity` — `diff_drive_controller` dùng để tính odometry.
- `position` — góc quay tích lũy, `joint_state_broadcaster` publish ra `/joint_states` để `robot_state_publisher` xoay bánh xe đúng góc trong RViz.

Thiếu `position` thì robot vẫn chạy đúng trong Gazebo nhưng bánh xe đứng im trong RViz — một lỗi trông rất khó hiểu nếu không biết mắt xích này.

## Ví dụ trong dự án Atlas

File `atlas_control/urdf/atlas.control.xacro` là **lớp thứ 3** của kiến trúc xacro ([Module 3 bài 6](../module-03-urdf-xacro/06-doc-urdf-atlas.md)): include `atlas.gazebo.xacro` (vốn đã include `atlas.urdf.xacro`) rồi thêm phần điều khiển.

Ngoài thẻ `<ros2_control>`, file này còn nạp plugin cho Gazebo:

```xml
<gazebo>
  <plugin filename="gz_ros2_control-system" name="gz_ros2_control::GazeboSimROS2ControlPlugin">
    <ros>
      <remapping>/diff_drive_controller/cmd_vel_unstamped:=/cmd_vel</remapping>
      <remapping>/diff_drive_controller/odom:=/odom</remapping>
    </ros>
    <parameters>$(find atlas_control)/config/diff_drive_controller.yaml</parameters>
  </plugin>
</gazebo>
```

Ba điều đáng chú ý:

**Plugin này tự khởi động `controller_manager`** bên trong tiến trình Gazebo ngay khi robot được spawn, và tự nạp file YAML trỏ trong `<parameters>`. Bạn không chạy `ros2 run controller_manager ros2_control_node` ở đâu cả.

**`$(find atlas_control)` được xacro phân giải thành đường dẫn tuyệt đối** lúc xử lý file, vì plugin cần path thật trên đĩa chứ không hiểu URI kiểu `package://`.

**Remapping đưa topic về tên chuẩn.** Mặc định `diff_drive_controller` publish/subscribe dưới namespace riêng (`/diff_drive_controller/cmd_vel_unstamped`, `/diff_drive_controller/odom`). Remap về `/cmd_vel` và `/odom` cho khớp quy ước mà `teleop_twist_keyboard` (Module 7) và Nav2 (Module 10) mặc định dùng — đỡ phải nhớ tên dài ở mọi module sau.

Giới hạn `min`/`max` = ±10 rad/s trên `command_interface`: với `wheel_radius` 0,05 m thì tương đương khoảng 0,5 m/s ở mép bánh — trần cứng ở tầng phần cứng, độc lập với giới hạn mềm cấu hình trong YAML ([bài 4](04-dong-hoc-vi-sai.md)).

## Thử ngay

```bash
ros2 launch atlas_control controller.launch.py
ros2 control list_hardware_interfaces
```
Kết quả liệt kê đúng những gì đã khai: 2 command interface (velocity), 4 state interface (position + velocity cho mỗi bánh).

```bash
# So 3 lớp xacro -- lớp control thêm đúng phần ros2_control
xacro src/atlas_control/urdf/atlas.control.xacro | grep -A3 "ros2_control"

# /joint_states giờ đến từ đâu?
ros2 topic info /joint_states --verbose | grep -A2 "Publisher"
```

Thử bỏ một `state_interface`: xóa dòng `<state_interface name="position"/>` của bánh trái, build lại, chạy lại rồi mở RViz (`rviz2`, thêm `RobotModel` + `TF`). Robot vẫn chạy trong Gazebo nhưng **bánh trái không xoay trong RViz**. Đây chính xác là triệu chứng đã mô tả ở trên — gặp một lần thì sau này nhận ra ngay.

---
*Tiếp theo: [Controller & spawner →](03-controller-va-spawner.md)*
