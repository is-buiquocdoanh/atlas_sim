# 3. Controller, file config và spawner

*[← Hardware interface](02-hardware-interface.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Động học vi sai →](04-dong-hoc-vi-sai.md)*

## Định nghĩa

**Controller** là plugin chạy bên trong `controller_manager`, không phải node riêng. Nó được **nạp** (load), **cấu hình** (configure) rồi **kích hoạt** (activate) — 3 bước của vòng đời, và `spawner` là công cụ làm cả 3 trong một lệnh.

## Cơ chế

File YAML có **cấu trúc 2 tầng** mà người mới hay nhầm:

```yaml
controller_manager:
  ros__parameters:
    update_rate: 100
    diff_drive_controller:              # tầng 1: KHAI BÁO controller này tồn tại, kiểu gì
      type: diff_drive_controller/DiffDriveController

diff_drive_controller:                  # tầng 2: THAM SỐ của chính controller đó
  ros__parameters:
    left_wheel_names: ["left_wheel_joint"]
    wheel_separation: 0.30
```
Tầng 1 nằm trong `controller_manager` và chỉ nói *tên → kiểu*. Tầng 2 là một khối riêng ở cấp cao nhất, trùng tên controller. Đặt nhầm tham số vào tầng 1 thì controller khởi động với giá trị mặc định mà **không báo lỗi gì** — robot chạy sai âm thầm.

**Vòng đời controller**:
```
unconfigured --configure--> inactive --activate--> active
```
- `inactive`: đã nạp, đã đọc tham số, nhưng **chưa chiếm interface** và chưa chạy.
- `active`: đang chiếm `command_interface` và được gọi mỗi chu kỳ.

`spawner` gọi service của `controller_manager` để đi hết 3 bước. Nó **tự chờ và retry** cho tới khi service sẵn sàng — nên không cần thêm delay hay event handler thủ công trong launch file, dù `controller_manager` chỉ ra đời sau khi Gazebo spawn xong robot.

Chính vì spawner chờ vô hạn nên **thông báo `waiting for service /controller_manager/list_controllers...` lặp mãi không phải lỗi của spawner** — nó là triệu chứng cho biết `controller_manager` chưa bao giờ được tạo ra, hầu như luôn do plugin `gz_ros2_control` không nạp được (xem phần Thử ngay).

## Ví dụ trong dự án Atlas

`atlas_control/launch/controller.launch.py` gọn đúng 3 phần:

```python
spawn_with_control = IncludeLaunchDescription(        # tái dùng launch Module 4,
    ...spawn_robot.launch.py...,                      # chỉ override model
    launch_arguments={"model": ".../atlas.control.xacro",
                      "world": LaunchConfiguration("world")}.items(),
)
joint_state_broadcaster_spawner = Node(
    package="controller_manager", executable="spawner",
    arguments=["joint_state_broadcaster"],
)
diff_drive_controller_spawner = Node(
    package="controller_manager", executable="spawner",
    arguments=["diff_drive_controller"],
)
```

Không có dòng nào mở world hay spawn robot — toàn bộ việc đó tái dùng từ `atlas_gazebo` bằng cách đổi tham số `model`. Đây đúng là chỗ thiết kế "`model` là launch argument" ở [Module 4 bài 4](../module-04-gazebo/04-spawn-robot.md) trả công.

Một tham số trong `diff_drive_controller.yaml` đáng nhớ vì nó gây ra lỗi khó chịu nhất module này:

```yaml
use_stamped_vel: false
```

Bản `diff_drive_controller` đi kèm Humble mặc định là `true`, tức là **chờ `TwistStamped`** trên topic lệnh. Nhưng `teleop_twist_keyboard` và `ros2 topic pub` thông thường đều phát `Twist` trần. Để mặc định thì: controller active, topic tồn tại, không log lỗi nào — mà robot đứng im. Repo đã đặt sẵn `false`, đừng đổi lại.

Các tham số còn lại đọc là hiểu: `left_wheel_names`/`right_wheel_names` (khớp nào là bánh nào), `wheel_separation`/`wheel_radius` ([bài 4](04-dong-hoc-vi-sai.md)), `odom_frame_id`/`base_frame_id`, `publish_rate: 50.0`, `cmd_vel_timeout: 0.5` (mất lệnh quá 0,5 s thì tự dừng — một cơ chế an toàn quan trọng, robot thật mất kết nối sẽ không lao đi tiếp).

## Thử ngay

```bash
ros2 launch atlas_control controller.launch.py
```
```bash
ros2 control list_controllers                       # tên, kiểu, trạng thái
ros2 param get /diff_drive_controller wheel_radius  # tham số đã vào chưa
ros2 control list_controller_types | head           # những controller có sẵn trên máy
```

**Chẩn đoán khi spawner treo** — chạy theo thứ tự này:
```bash
ros2 node list | grep controller_manager    # trống => controller_manager chưa ra đời
# xem log Gazebo tìm dòng:
#   Failed to load system plugin [gz_ros2_control-system] : couldn't find shared library
```
Nếu đúng dòng đó: thiếu gói `ros-humble-gz-ros2-control`, chạy `./scripts/setup.sh`. Triệu chứng đi kèm rất dễ nhận: robot **tự xoay tròn** trong Gazebo vì 2 khớp bánh không ai giữ, thành khớp tự do hoàn toàn.

Chơi với vòng đời controller:
```bash
ros2 control set_controller_state diff_drive_controller inactive
ros2 control list_hardware_interfaces          # interface không còn [claimed]
ros2 control set_controller_state diff_drive_controller active
```

---
*Tiếp theo: [Động học vi sai →](04-dong-hoc-vi-sai.md)*
