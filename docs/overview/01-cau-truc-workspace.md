# 01. Cấu trúc workspace (Workspace Structure)

## Nguyên tắc tổ chức

Tách theo **chức năng**, đúng convention phổ biến của các gói robot ROS 2 (giống cấu trúc `turtlebot3_*`, `linorobot2`): mỗi package làm một việc, học viên có thể build/test từng phần riêng, và mỗi package tương ứng gọn với 1-2 module trong khóa học.

## Cây thư mục đề xuất

```
atlas_sim/                         # ROS 2 workspace (colcon workspace root)
├── docs/                          # Tài liệu khóa học (đã có)
│   └── course/                    # Nội dung bài học chi tiết từng module (xem 02 cho outline)
├── src/
│   ├── ros2_basics/                # Module 1: node/pub-sub/service/param/launch, KHÔNG phụ
│   │   │                            # thuộc robot Atlas -- cố tình không đặt tên atlas_*
│   │   │                            # (nội dung generic ROS 2, không riêng gì Atlas)
│   │   ├── ros2_basics/
│   │   │   ├── sensor_publisher.py       # Node + Publisher + Timer + Parameter
│   │   │   ├── data_logger.py            # Subscriber + Service server (Trigger, báo cáo)
│   │   │   ├── stats_client.py           # Service client (Trigger)
│   │   │   ├── add_two_ints_server.py    # Service server TÍNH TOÁN thật (AddTwoInts)
│   │   │   └── add_two_ints_client.py    # Service client tương ứng
│   │   └── launch/
│   │       └── demo.launch.py
│   │
│   ├── atlas_description/         # URDF/XACRO, meshes, RViz config
│   │   ├── urdf/
│   │   │   ├── atlas.urdf.xacro
│   │   │   ├── wheel.xacro
│   │   │   └── sensors.xacro      # LiDAR, IMU mount
│   │   ├── meshes/
│   │   ├── rviz/
│   │   │   └── atlas_view.rviz
│   │   └── launch/
│   │       └── display.launch.py  # xem robot trong RViz, không cần Gazebo
│   │
│   ├── atlas_gazebo/               # Tích hợp Gazebo (Fortress / gz-sim)
│   │   ├── worlds/
│   │   │   ├── empty.sdf
│   │   │   ├── maze.sdf            # world cho SLAM/Nav2/capstone
│   │   │   └── warehouse.sdf       # world nâng cao (tùy chọn, chưa tạo)
│   │   ├── urdf/
│   │   │   └── atlas.gazebo.xacro  # include atlas_description + <gazebo> (ma sát, sensor scan/imu)
│   │   ├── launch/
│   │   │   └── spawn_robot.launch.py
│   │   └── config/
│   │       └── gz_bridge.yaml      # cấu hình ros_gz_bridge (topic Gazebo <-> ROS 2)
│   │
│   ├── atlas_control/              # ros2_control + diff_drive_controller
│   │   ├── urdf/
│   │   │   └── atlas.control.xacro # include atlas_gazebo + <ros2_control> + plugin gz_ros2_control
│   │   ├── config/
│   │   │   └── diff_drive_controller.yaml
│   │   └── launch/
│   │       └── controller.launch.py  # include atlas_gazebo/spawn_robot.launch.py (override model=)
│   │
│   ├── atlas_bringup/               # Điểm khởi chạy chung + các thứ không thuộc riêng 1 package.
│   │   ├── launch/
│   │   │   ├── bringup.launch.py   # điểm vào DUY NHẤT cho tầng mô phỏng -- chỉ include lại
│   │   │   │                        # atlas_control/controller.launch.py, KHÔNG viết lại logic
│   │   │   │                        # (xem "Vì sao tách gói như vậy" bên dưới)
│   │   │   └── joystick_teleop.launch.py  # joy_node + teleop_twist_joy + twist_mux -> /cmd_vel
│   │   └── config/
│   │       └── joystick_teleop.yaml
│   │
│   ├── atlas_slam/                  # SLAM (tạo bản đồ) + Navigation (Nav2), gộp chung
│   │   ├── config/
│   │   │   ├── mapper_params.yaml     # slam_toolbox params, mode=mapping (Module 8)
│   │   │   ├── mapper_params_localization.yaml  # slam_toolbox params, mode=localization
│   │   │   │                          # (phương án thay AMCL, Module 9, xem navigation.launch.py)
│   │   │   ├── nav2_params_dwb.yaml   # Nav2 đầy đủ (amcl/costmap/planner/bt) + controller=DWB
│   │   │   ├── nav2_params_rpp.yaml   # y hệt file trên, chỉ khác controller=Regulated Pure Pursuit
│   │   │   └── nav2_params_mppi.yaml  # y hệt file trên, chỉ khác controller=MPPI
│   │   ├── rviz/
│   │   │   └── atlas_slam.rviz     # Map(/map) + RobotModel + TF + LaserScan, fixed frame "map"
│   │   ├── scripts/
│   │   │   └── send_goal_and_time.py  # `ros2 run atlas_slam send_goal_and_time.py --goal_x.. --goal_y..`
│   │   ├── launch/
│   │   │   ├── slam.launch.py      # CHỈ slam_toolbox online_async + rviz, KHÔNG spawn robot/world
│   │   │   └── navigation.launch.py  # khai báo tường minh từng node Nav2 (không include
│   │   │                              # nav2_bringup); arg controller:=dwb|rpp|mppi chọn config,
│   │   │                              # arg localization:=amcl|slam_toolbox chọn kiểu định vị
│   │   │                            # (bringup là atlas_control, chạy riêng ở terminal khác -- giống
│   │   │                            # quy trình thực tế: SLAM không quan tâm robot thật hay mô phỏng)
│   │   └── maps/
│   │       └── README.md           # hướng dẫn lưu map bằng 2 lệnh: map_saver_cli (.pgm/.yaml,
│   │                                 # cho AMCL) và slam_toolbox serialize_map (.posegraph/.data,
│   │                                 # cho localization:=slam_toolbox) -- 2 định dạng khác nhau
│   │
│   ├── atlas_apps/                  # Node ứng dụng do học viên/giảng viên viết (Python)
│   │   ├── atlas_apps/
│   │   │   ├── waypoint_follower.py    # dùng Nav2 Simple Commander API
│   │   │   ├── patrol_node.py          # demo tuần tra nhiều điểm
│   │   │   └── goal_sender.py
│   │   └── launch/
│   │
│   └── atlas_msgs/                  # (tùy chọn) custom msg/srv/action nếu cần cho capstone
│
├── .devcontainer/ hoặc Dockerfile   # môi trường đóng gói cho học viên (xem 03-yeu-cau-moi-truong.md)
└── README.md                       # hướng dẫn quick-start, trỏ vào docs/
```

## Vì sao tách gói như vậy

- `atlas_description` tách riêng để module 2 (URDF) học viên chỉ cần package này, không bị rối bởi Gazebo/Nav2.
- `atlas_gazebo` vs `atlas_control` tách riêng vì đây là ranh giới quan trọng học viên hay nhầm: **Gazebo mô phỏng vật lý**, còn **ros2_control quản lý bộ điều khiển** — tách gói giúp minh họa rõ hai khái niệm khác nhau.
- `atlas_bringup` (quyết định lại lần 2): ban đầu định KHÔNG bọc lại sim/slam ở đây, để giữ nguyên tắc "bringup và ứng dụng phía trên là 2 tầng tách biệt" (SLAM không nên tự spawn robot/world, phải giả định bringup đã chạy sẵn, giống thực tế). Nhưng học viên dễ nhầm/quên phải chạy `atlas_control controller.launch.py` trước — nên `atlas_bringup/bringup.launch.py` được thêm làm **điểm vào DUY NHẤT, dễ nhớ**, cho toàn bộ tầng mô phỏng: nó CHỈ include lại `atlas_control/controller.launch.py` (không viết lại logic, không tự ý spawn gì thêm), nên KHÔNG vi phạm nguyên tắc tách tầng — chỉ là 1 lớp đặt tên lại cho dễ dùng. `atlas_control/controller.launch.py` vẫn giữ nguyên, dùng độc lập được khi chỉ làm việc trong phạm vi Module 5. Ngoài ra `atlas_bringup` vẫn chứa những thứ **không thuộc riêng layer nào** — ví dụ joystick teleop (`joy` + `teleop_twist_joy` + `twist_mux`), thứ có thể dùng chung với bất kỳ layer nào (control thô, SLAM, hay Nav2) mà không tự ý spawn hay sở hữu robot.
- `atlas_slam` gộp chung cấu hình **tạo bản đồ** (`slam_toolbox`) và **điều hướng** (Nav2/AMCL) vào một package, vì hai việc này dùng chung dữ liệu bản đồ và trong thực tế luôn đi cùng nhau (map do SLAM tạo ra chính là input cho Nav2/AMCL) — tách quá vụn ở đây (như bản đề xuất ban đầu) chỉ tạo thêm 1 package không cần thiết mà không có ranh giới khái niệm rõ ràng như trường hợp `atlas_gazebo`/`atlas_control`. Package này là nơi duy nhất học viên cần mở khi làm Module 8-11, dễ diff khi thử tune tham số (bài tập kiểu "đổi `nav2_params_dwb.yaml` sang `nav2_params_mppi.yaml`, quan sát robot đổi hành vi thế nào").
- `atlas_apps` là nơi *học viên tự viết code* trong các bài tập/capstone — tách khỏi code mẫu "chuẩn" của giảng viên để tránh học viên sửa nhầm file lõi.

## Quy ước đặt tên

- Package: `atlas_<chức_năng>`, snake_case.
- Launch file: `<mục_đích>.launch.py`.
- Topic robot phát ra tuân theo REP-105/REP-103 chuẩn ROS (frame `base_link`, `odom`, `map`; topic `/cmd_vel`, `/odom`, `/scan`, `/imu`) để học viên quen với convention sẽ gặp ở mọi robot ROS 2 khác, không chỉ Atlas.

## Ghi chú triển khai

Cấu trúc trên là **đề xuất ban đầu** — khi code thực tế có thể gộp bớt package nếu thấy quá vụn (ví dụ gộp `atlas_control` vào `atlas_bringup` nếu config controller nhỏ). Ưu tiên: mỗi package học viên mở ra phải hiểu ngay "package này để làm gì" trong tối đa 1 câu.
