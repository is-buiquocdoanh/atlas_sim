# 7. Cấu trúc package ROS 2 (`ament_python`)

*[← Launch file](06-launch-file.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](08-bai-tap.md)*

## Định nghĩa

**Package** là đơn vị đóng gói nhỏ nhất — thư mục chứa node/launch/config + 2 file bắt buộc để `colcon` và `ros2` nhận diện. **Workspace** là thư mục chứa nhiều package, build cùng lúc (`~/atlas_sim`).

2 kiểu build: **`ament_python`** (package thuần Python, dùng ở bài học này) và **`ament_cmake`** (C++, hoặc package chỉ chứa launch/config/URDF không cần build gì — hầu hết `atlas_*` dùng kiểu này).

## Cơ chế

```
ros2_basics/
├── package.xml          # metadata + phụ thuộc (cho rosdep/tooling, KHÔNG phải Python import)
├── setup.py              # entry_points: cầu nối `ros2 run` <-> hàm main()
├── setup.cfg              # nơi cài script thực thi
├── resource/ros2_basics   # file rỗng, để ament_index nhận diện package
├── ros2_basics/            # package Python thật, TRÙNG TÊN package
│   └── *.py
└── launch/
```

`entry_points` trong `setup.py`:
```python
entry_points={"console_scripts": ["sensor_publisher = ros2_basics.sensor_publisher:main"]}
```
Thiếu dòng này — code vẫn `import` được, nhưng `ros2 run` không tìm thấy executable — lỗi hay gặp khi tự thêm node mới.

```bash
colcon build --packages-select ros2_basics
source install/setup.bash      # cần lại ở MỖI terminal mới
ros2 run ros2_basics sensor_publisher
```

## Ví dụ trong bài học

Tự tạo 1 package mới để chắc chắn hiểu (không copy):
```bash
cd ~/atlas_sim/src
ros2 pkg create --build-type ament_python my_test_pkg --dependencies rclpy std_msgs
```

## Ví dụ trong dự án Atlas

`atlas_control/CMakeLists.txt` (`ament_cmake`):
```cmake
find_package(ament_cmake REQUIRED)
install(DIRECTORY urdf config launch DESTINATION share/${PROJECT_NAME})
ament_package()
```
Không có `entry_points` (không có node Python nào cần chạy qua `ros2 run` ở đây) — `install(DIRECTORY ...)` chỉ copy thư mục vào `share/atlas_control/` lúc build, để `get_package_share_directory("atlas_control")` tìm thấy. Package `atlas_*` có `<buildtool_depend>ament_cmake</buildtool_depend>` trong `package.xml` — đúng điểm khác biệt duy nhất cần nhớ khi chỉ ĐỌC code.

---
*Tiếp theo: [Bài tập →](08-bai-tap.md)*
