# 02. Lộ trình khóa học (Course Roadmap)

13 module, chia làm 4 giai đoạn. Mỗi module gồm: **Mục tiêu**, **Nội dung chính**, **Thực hành trên Atlas**, **Bài tập**. Thời lượng ước tính giả định học viên mới, học bán thời gian (~5-8 giờ/tuần).

Quy ước mỗi bài học nên có 2 tầng nội dung (xem [00](00-tong-quan-du-an.md)):
- 🔧 **Làm được** — thực hành, có thể copy-paste chạy ngay và thấy kết quả.
- 🧠 **Hiểu vì sao** — lý thuyết/thuật toán, đủ sâu để trích dẫn trong báo cáo/đồ án.

---

## Giai đoạn 1 — Nền tảng ROS 2 (Foundations)

### Module 0 — Setup môi trường (~3-4 giờ)
- **Mục tiêu**: có máy chạy được ROS 2 Humble + Gazebo Fortress, biết `colcon build`, `source`, mở được RViz.
- 🔧 Cài Ubuntu 22.04 (hoặc container/WSL2 nếu học viên dùng Windows/Mac), cài ROS 2 Humble, cài `ros-humble-desktop` + `ros-humble-ros-gz`, clone repo `atlas_sim`, build thử.
- 🧠 ROS 2 là gì, khác ROS 1 chỗ nào (DDS, không cần roscore), vì sao chọn Humble (khớp Ubuntu 22.04 phổ biến, còn hỗ trợ đến 5/2027).
- **Bài tập**: chạy `ros2 doctor`, `ros2 topic list` trên một demo có sẵn (turtlesim), chụp màn hình nộp.

### Module 1 — ROS 2 core concepts (~6-8 giờ)
- **Mục tiêu**: hiểu và tự viết được node, publisher/subscriber, service, param, launch file.
- 🔧 Viết 1 node Python publisher đơn giản (giả lập cảm biến), 1 node subscriber; tạo 1 service; đọc/ghi parameter; viết launch file Python chạy cả 2 node.
- 🧠 Kiến trúc pub/sub vs client/server vs action; DDS/QoS là gì (khi nào cần Reliable vs Best Effort — liên hệ tới `/scan` sau này); workspace/package/`package.xml`/`setup.py` (ament_python) và ý nghĩa từng phần.
- **Bài tập**: viết node "temperature_monitor" publish giả lập + node cảnh báo subscribe và log khi vượt ngưỡng, có launch file khởi động cả hai.

### Module 2 — TF2 & tọa độ (~3-4 giờ)
- **Mục tiêu**: hiểu hệ tọa độ robot, TF tree, vì sao mọi thứ trong ROS đều "có frame".
- 🔧 Chạy `static_transform_publisher`, xem TF tree bằng `ros2 run tf2_tools view_frames` và `tf2_echo`.
- 🧠 REP-103 (đơn vị, chiều trục), REP-105 (frame chuẩn: `map` → `odom` → `base_link`), vì sao tách `map` và `odom` (drift vs global correction) — khái niệm này sẽ quay lại ở Module 8 (AMCL).
- **Bài tập**: vẽ tay sơ đồ TF tree dự kiến của Atlas (base_link, wheel_left, wheel_right, caster, lidar_link, imu_link) trước khi thấy đáp án ở Module 3.

---

## Giai đoạn 2 — Mô phỏng robot Atlas (Simulation)

### Module 3 — Mô hình hóa robot với URDF/XACRO (~6-8 giờ)
- **Mục tiêu**: tự viết được URDF diff-drive từ đầu, hiểu link/joint.
- 🔧 Viết `atlas.urdf.xacro`: `base_link` (hộp chữ nhật) + 2 `wheel` (continuous joint) + 1 `caster` (fixed/planar joint) + mount cho LiDAR/IMU; dùng `xacro` macro để không lặp code 2 bánh; xem robot trong RViz qua `robot_state_publisher` + `joint_state_publisher_gui`.
- 🧠 Link vs joint vs frame; các loại joint (`fixed`, `continuous`, `revolute`, `prismatic`); vì sao dùng xacro thay vì URDF thuần (tránh lặp, tham số hóa kích thước bánh xe).
- **Bài tập**: đổi bán kính bánh xe/khoảng cách 2 bánh (wheel separation) qua tham số xacro, quan sát robot đổi hình dạng trong RViz mà không sửa logic khác.

### Module 4 — Đưa robot vào Gazebo (~5-6 giờ)
- **Mục tiêu**: robot Atlas đứng được trong Gazebo Fortress, có vật lý (trọng lượng, ma sát, va chạm).
- 🔧 Thêm tag `<gazebo>` + inertial vào URDF; viết world file đơn giản; launch `gz sim` (Fortress) + `ros_gz_sim create` để spawn robot; cấu hình `ros_gz_bridge` để bridge topic (nếu cần).
- 🧠 Sự khác biệt Gazebo Classic (plugin `gazebo_ros_pkgs`, ROS 1 di sản) vs Gazebo mới/`gz-sim` (Fortress cho Humble, Harmonic cho Jazzy — cùng kiến trúc plugin mới, giao tiếp qua `ros_gz_bridge`); vì sao cần khối lượng/inertia hợp lý (robot "nổ" hoặc rơi xuyên sàn nếu sai).
- **Bài tập**: robot đứng vững, không rung/lật khi spawn; thử đặt sai inertia (ví dụ = 0) để tự thấy lỗi vật lý xảy ra thế nào — rồi sửa lại.

### Module 5 — Điều khiển với ros2_control (~5-6 giờ)
- **Mục tiêu**: robot di chuyển được bằng `cmd_vel`, hiểu kiến trúc `ros2_control`.
- 🔧 Cấu hình `diff_drive_controller` qua `gz_ros2_control`; publish `/cmd_vel` bằng `ros2 topic pub` để robot chạy tới/lui/quay; kiểm tra `/odom` được publish đúng.
- 🧠 Kiến trúc `ros2_control`: controller manager, hardware interface, controller — vì sao tách lớp này (để sau chuyển sang robot thật chỉ cần đổi hardware interface, giữ nguyên controller); động học vi sai (differential drive kinematics: từ `v`, `ω` ra vận tốc bánh trái/phải và ngược lại).
- **Bài tập**: viết công thức tay tính vận tốc bánh trái/phải từ `v=0.2 m/s, ω=0.5 rad/s` với `wheel_separation` cho trước, rồi verify bằng cách quan sát robot chạy trong Gazebo có khớp không.

### Module 6 — Cảm biến: LiDAR & IMU (~4-5 giờ)
- **Mục tiêu**: robot "nhìn thấy" môi trường.
- 🔧 Thêm plugin LiDAR 2D và IMU vào URDF/SDF; xem dữ liệu `/scan` (LaserScan) và `/imu` trong RViz và bằng `ros2 topic echo`.
- 🧠 Ý nghĩa từng field của `sensor_msgs/LaserScan` (angle_min/max, ranges, intensities); vì sao cần TF đúng (`lidar_link` → `base_link`) để dữ liệu hiển thị đúng vị trí.
- **Bài tập**: đặt vật cản trong world, quan sát `/scan` phản ánh đúng khoảng cách; thử lệch TF `lidar_link` cố ý để thấy dữ liệu "sai vị trí" trong RViz trông như thế nào (bài tập debug ngược).

### Module 7 — Teleoperation & RViz (~2-3 giờ)
- **Mục tiêu**: điều khiển robot thủ công thành thạo trước khi tự động.
- 🔧 `teleop_twist_keyboard`, cấu hình RViz để hiển thị robot model + TF + LaserScan + Odometry cùng lúc; lưu file `.rviz` cấu hình sẵn cho học viên.
- 🧠 `twist_mux` là gì và tại sao cần khi có nhiều nguồn phát `cmd_vel` (teleop, Nav2, an toàn) — giới thiệu trước, dùng thật ở Module 10.
- **Bài tập**: lái robot Atlas đi hết một mê cung đơn giản bằng bàn phím, ghi lại thời gian — làm baseline để so sánh với navigation tự động sau này.

---

## Giai đoạn 3 — Navigation2 (Autonomy)

### Module 8 — SLAM: tự vẽ bản đồ (~5-6 giờ)
- **Mục tiêu**: robot tự vẽ bản đồ môi trường khi được lái đi vòng quanh.
- 🔧 Chạy `slam_toolbox` (chế độ online async) cùng `atlas_bringup slam.launch.py`; lái robot (teleop) đi khắp world; lưu bản đồ bằng `nav2_map_server` (`map_saver_cli`).
- 🧠 Nguyên lý SLAM ở mức trực quan (scan matching, pose graph optimization), vì sao SLAM cần TF `odom`→`base_link` chính xác tương đối (không cần tuyệt đối) trong khi AMCL (module sau) cần map cố định.
- **Bài tập**: vẽ bản đồ world "maze" đi kèm repo, lưu file `.pgm` + `.yaml`, so sánh bản đồ tạo ra với world gốc.

### Module 9 — Localization với AMCL (~3-4 giờ)
- **Mục tiêu**: robot biết mình đang ở đâu trên bản đồ đã có sẵn.
- 🔧 Load bản đồ đã lưu ở Module 8, chạy `amcl`, đặt "2D Pose Estimate" trong RViz, quan sát đám mây hạt (particle cloud) hội tụ khi robot di chuyển.
- 🧠 Particle filter / Monte Carlo Localization trực quan — vì sao cần "phân tán hạt" ban đầu, vì sao particle cloud hội tụ khi robot di chuyển và quan sát thêm dữ liệu cảm biến.
- **Bài tập**: đặt sai pose ban đầu (initial pose) cố ý, quan sát bao lâu AMCL "tự sửa" lại đúng vị trí thật.

### Module 10 — Nav2 core: costmap, planner, controller (~8-10 giờ) — module trọng tâm
- **Mục tiêu**: robot tự đi từ điểm A đến điểm B, tự né vật cản.
- 🔧 Cấu hình `nav2_params.yaml` đầy đủ: global costmap + local costmap (layer static, obstacle, inflation), global planner (NavFn hoặc Smac Planner), local controller (DWB hoặc Regulated Pure Pursuit hoặc MPPI), behavior tree navigator mặc định; gửi goal qua RViz ("Nav2 Goal") và qua CLI.
- 🧠 Costmap là gì (occupancy grid + inflation layer để giữ khoảng cách an toàn); so sánh thuật toán planner (A*/Dijkstra kiểu NavFn vs Smac Hybrid-A* vs lattice); so sánh thuật toán controller (DWB — Dynamic Window Approach, RPP — Regulated Pure Pursuit, MPPI — Model Predictive Path Integral) — ưu nhược điểm từng loại, khi nào chọn loại nào.
- **Bài tập**: thử đổi planner/controller trong config, cho robot đi cùng một quãng đường, so sánh thời gian & độ mượt quỹ đạo; viết nhận xét (đây là phần rất hữu ích để đưa vào báo cáo đồ án).

### Module 11 — Recovery behaviors & behavior tree (~4-5 giờ)
- **Mục tiêu**: robot xử lý được tình huống bất thường (kẹt, mất đường đi) thay vì đứng im mãi.
- 🔧 Xem behavior tree XML mặc định của Nav2 (`navigate_w_replanning_and_recovery.xml`); kích hoạt tình huống robot bị kẹt (đặt vật cản chặn đường) để quan sát recovery behavior (spin, backup, wait) tự kích hoạt.
- 🧠 Behavior tree là gì (so với state machine truyền thống), cách đọc/sửa 1 file BT XML đơn giản, vì sao Nav2 chọn kiến trúc BT.
- **Bài tập**: tùy chỉnh behavior tree — thêm/bớt 1 recovery behavior, quan sát robot phản ứng khác đi.

### Module 12 — Waypoint following & Nav2 Simple Commander API (~4-5 giờ)
- **Mục tiêu**: điều khiển navigation bằng code Python thay vì click chuột trong RViz — chuẩn bị cho capstone.
- 🔧 Dùng `nav2_simple_commander` viết node Python: gửi 1 goal, gửi nhiều waypoint liên tiếp (patrol), theo dõi trạng thái/feedback, hủy goal giữa chừng.
- 🧠 Action client/server (liên hệ lại Module 1) — `NavigateToPose` là action, không phải service, vì sao (tác vụ dài, cần feedback + cancel).
- **Bài tập**: viết node `patrol_node.py` cho robot đi tuần tra 4 điểm cố định lặp vô hạn, có xử lý khi 1 điểm không thể đến được (timeout/fail).

---

## Giai đoạn 4 — Capstone

### Module 13 — Đồ án cuối khóa (~1-2 tuần)
Xem chi tiết ở [04-capstone-va-danh-gia.md](04-capstone-va-danh-gia.md). Tóm tắt: tích hợp toàn bộ stack (SLAM → map → Nav2 → waypoint app tự viết) vào một kịch bản hoàn chỉnh, ví dụ "robot giao hàng tự động trong kho mô phỏng".

---

## Bảng tổng hợp thời lượng

| Giai đoạn | Module | Thời lượng ước tính |
|---|---|---|
| 1. Nền tảng ROS 2 | 0-2 | ~12-16 giờ |
| 2. Mô phỏng Atlas | 3-7 | ~22-28 giờ |
| 3. Navigation2 | 8-12 | ~24-30 giờ |
| 4. Capstone | 13 | 1-2 tuần |
| **Tổng** | | **~9-11 tuần** (bán thời gian) |

## Phụ lục đề xuất (không bắt buộc, làm sau)

- **Phụ lục A**: Từ mô phỏng sang robot thật — thay `gz_ros2_control` bằng driver thật (vi điều khiển bánh xe, encoder), những gì giữ nguyên/phải đổi.
- **Phụ lục B**: Multi-robot navigation (namespace, TF prefix) — nếu mở rộng khóa học nâng cao.
- **Phụ lục C**: Docker/devcontainer troubleshooting, lỗi thường gặp khi cài ROS 2 trên các hệ điều hành khác nhau.
- **Phụ lục D**: Ánh xạ thuật ngữ Anh-Việt dùng xuyên suốt khóa học (để nhất quán, ví dụ "costmap" không dịch, "vi sai" = differential, v.v.).
