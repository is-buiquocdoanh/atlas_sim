# 00. Tổng quan dự án (Project Overview)

## Ý tưởng cốt lõi

Xây dựng **một dự án mô phỏng duy nhất** — robot diff-drive tên **Atlas** chạy trong Gazebo với ROS 2 — rồi dùng chính dự án đó làm **xương sống cho một khóa học ROS 2 & Navigation2**. Thay vì tách rời "code mẫu" và "bài giảng", mỗi module của khóa học tương ứng với một cột mốc phát triển thật của dự án: học xong module nào, robot có thêm khả năng đó.

Cách tiếp cận này giải quyết vấn đề phổ biến của các khóa học ROS: dạy khái niệm rời rạc (một node "hello world", một demo TF không liên quan gì đến nhau) khiến người học không thấy được bức tranh hệ thống. Ở đây, học viên đi từ URDF trống → robot chạy được trong Gazebo → có cảm biến → tự vẽ bản đồ → tự né vật cản → tự đi giao hàng, tất cả trên cùng một robot, cùng một repo.

## Mục tiêu kép

1. **Dự án (product)**: một ROS 2 workspace hoàn chỉnh, chạy được ngay (`ros2 launch atlas_bringup sim.launch.py` là ra robot trong Gazebo với Nav2 sẵn sàng), có thể dùng làm nền tảng cho các dự án robot thật sau này (đổi URDF, giữ nguyên stack điều hướng).
2. **Khóa học (education)**: tài liệu học từng bước, mỗi bước có mục tiêu rõ ràng, bài tập, và điểm dừng để kiểm tra hiểu bài — đủ để người mới hoàn toàn về ROS 2 đi từ zero đến tự làm được đồ án tốt nghiệp về navigation.

## Đối tượng học viên

- **Người mới bắt đầu**: biết lập trình cơ bản (Python, có thể chưa biết C++ sâu), chưa từng dùng ROS. Cần được dẫn từ khái niệm node/topic/service trước khi chạm vào Nav2.
- **Sinh viên làm đồ án tốt nghiệp**: cần không chỉ chạy được demo mà còn hiểu *tại sao* — thuật toán đằng sau costmap, planner (A*, Smac), controller (DWB, RPP, MPPI), SLAM (scan matching, particle filter) — để viết được phần lý thuyết trong báo cáo.

→ Mỗi module nên có 2 lớp nội dung: **"Làm được"** (thực hành, copy-paste chạy ngay) và **"Hiểu vì sao"** (giải thích thuật toán, đủ sâu để trích dẫn trong báo cáo/luận văn).

## Vì sao chọn diff-drive đơn giản

- Diff-drive (2 bánh chủ động vi sai + 1 bánh đỡ/caster) là mô hình động học **đơn giản nhất** để suy luận (không cần Ackermann steering, không cần omni-wheel kinematics phức tạp) — người học tập trung được vào ROS 2/Nav2 thay vì cơ khí.
- Đây cũng chính là mô hình của **TurtleBot3** — robot chuẩn phổ biến nhất trong tài liệu Nav2 chính thức, nghĩa là học viên có thể đối chiếu bài học với tài liệu gốc của ROS khi bí.
- URDF gọn (2 wheel joint + 1 caster + 1 base_link + mount cho LiDAR/IMU) → dễ vẽ, dễ debug TF tree, không tốn thời gian dạy xacro macro phức tạp ngay từ đầu.
- Vẫn đủ để minh họa toàn bộ Nav2 stack (SLAM, AMCL, costmap, planner, controller, recovery) — vì Nav2 không quan tâm robot phức tạp thế nào, chỉ cần `cmd_vel` (Twist) và TF đúng chuẩn.

## Đề xuất tech stack

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Hệ điều hành | **Ubuntu 22.04 LTS** | Khớp với máy dev hiện tại của bạn; vẫn là LTS được hỗ trợ chính thức |
| ROS 2 distro | **Humble Hawksbill** (LTS, hỗ trợ đến 5/2027) | Distro chính thức đi kèm 22.04; còn ~9 tháng runway tính từ thời điểm viết (9/2026) tại thời điểm publish — đủ cho vòng đời khóa học, nhưng cần theo dõi mốc EOL (xem ghi chú bên dưới) |
| Simulator | **Gazebo Fortress** (gz-sim, không phải Gazebo Classic) | Gazebo Classic đã EOL (1/2025); Fortress là bản gz-sim chính thức đi kèm Humble theo REP-2000, cài qua `ros-humble-ros-gz` |
| Điều khiển | `ros2_control` + `gz_ros2_control` + `diff_drive_controller` | Chuẩn công nghiệp, tách biệt hardware interface — dễ chuyển sang robot thật sau này |
| SLAM | `slam_toolbox` | Đang là lựa chọn mặc định của cộng đồng Nav2, thay cho `gmapping`/`cartographer` cũ |
| Navigation | `Nav2` (behavior tree navigator, costmap 2D, Smac/NavFn planner, DWB/RPP/MPPI controller) | Stack điều hướng chính thức của ROS 2 |
| Cảm biến mô phỏng | 2D LiDAR (`gpu_lidar` hoặc `lidar` plugin), IMU, camera RGB tùy chọn | Đủ cho SLAM + obstacle avoidance, không cần depth camera phức tạp ở giai đoạn đầu |
| Build/tooling | `colcon`, `rosdep`, `vcstool` | Chuẩn ROS 2 workspace |
| Ngôn ngữ code mẫu | Python cho node ứng dụng (dễ đọc), URDF/XACRO cho mô tả robot, YAML cho config Nav2 | Python hạ rào cản cho người mới; có thể có phụ lục C++ cho phần "nâng cao" |

**Lưu ý quan trọng**: không dùng Gazebo Classic (`gazebo_ros_pkgs`) trong tài liệu chính — đây là lỗi rất phổ biến trong các tutorial cũ trên mạng khiến người học 2026 làm theo hướng dẫn đã lỗi thời. Nếu muốn tương thích ngược với các tutorial cũ, có thể để một phụ lục riêng.

**Về mốc EOL của Humble (5/2027)**: đây là rủi ro thật cần quản lý chứ không bỏ qua — không nên để khóa học "chết theo" distro. Hai lựa chọn giảm rủi ro, không loại trừ nhau:
- Cấu trúc code (đặc biệt `atlas_gazebo`, dùng `ros_gz` chứ không phải API Gazebo Classic) để việc nâng cấp lên Jazzy/Kilted sau này chỉ là đổi vài dòng cấu hình, không viết lại package.
- Cung cấp sẵn Dockerfile dùng base image Ubuntu 22.04 (xem [03](03-yeu-cau-moi-truong.md)) — tách môi trường học khỏi hệ điều hành thật của máy, để khi cần đổi sang Jazzy chỉ cần đổi image, học viên trên 22.04 hay 24.04 đều không bị ảnh hưởng.

## Điểm khác biệt (USP) so với các khóa ROS2 khác

- **Một robot, một repo, xuyên suốt** — không phải tập hợp demo rời rạc.
- **Có "Hiểu vì sao"** — phù hợp cả người đi làm lẫn sinh viên cần trích dẫn lý thuyết.
- **Cập nhật đúng stack hiện hành** (Humble + Gazebo Fortress + Nav2 mới), tránh dạy theo tutorial ROS1/Gazebo Classic đã lỗi thời tràn lan trên YouTube tiếng Việt.
- **Miễn phí phần cứng** — 100% chạy trong mô phỏng, học viên không cần mua robot thật để học xong toàn bộ khóa.
- **Có lối ra robot thật** — vì dùng `ros2_control`, module cuối có thể hướng dẫn thay `gz_ros2_control` bằng driver thật (ví dụ ESP32 + vi điều khiển bánh xe, đúng hướng người dùng đã từng làm ở các dự án robot khác).
