# 03. Yêu cầu môi trường (Environment Requirements)

## Yêu cầu phần cứng học viên

Không cần robot thật — toàn bộ khóa học chạy bằng mô phỏng. Yêu cầu máy tính:

| Mức | Cấu hình | Trải nghiệm |
|---|---|---|
| Tối thiểu | 4 core CPU, 8 GB RAM, GPU tích hợp | Gazebo Fortress chạy được nhưng có thể giật ở world phức tạp; nên tắt shadow/render nặng |
| Khuyến nghị | 6+ core CPU, 16 GB RAM, GPU rời (NVIDIA/AMD) | Mượt, có thể bật render đẹp cho demo/quay video báo cáo |
| Không bắt buộc | Robot thật | Chỉ cần cho Phụ lục A (mở rộng, không nằm trong lộ trình chính) |

## Hệ điều hành & 3 phương án cài đặt

Học viên Việt Nam thực tế dùng đủ loại máy (Windows, Mac, Linux) — cần đưa ra rõ 3 lựa chọn ngay từ Module 0 để tránh học viên bỏ cuộc vì không cài được môi trường (đây là điểm rơi rụng phổ biến nhất của các khóa ROS online):

1. **Ubuntu 22.04 cài trực tiếp / dual-boot** — trải nghiệm tốt nhất, khuyến nghị cho ai có máy Linux sẵn hoặc sẵn sàng dual-boot (đây cũng là máy dev chính dùng để xây dự án này).
2. **Docker / Devcontainer** (khuyến nghị mặc định cho khóa học) — dùng image đóng gói sẵn ROS 2 Humble + Gazebo Fortress + toàn bộ dependency của repo `atlas_sim`. Chạy được trên Windows/Mac/Linux qua Docker Desktop + WSL2 (Windows), và không phụ thuộc học viên đang có Ubuntu bản nào trên máy thật. GUI (Gazebo, RViz) forward qua X11/WSLg.
3. **WSL2 thuần (không Docker)** — cho học viên Windows muốn cài trực tiếp ROS 2 trong WSL2 Ubuntu 22.04, không qua container.

→ Đề xuất: **cung cấp sẵn `Dockerfile` + `docker-compose.yml`** trong repo `atlas_sim` ngay từ đầu, kèm script `./scripts/setup.sh` để giảm số bước cài đặt xuống mức tối thiểu. Đây nên là hạng mục ưu tiên cao khi build dự án (xem [05-ke-hoach-trien-khai.md](05-ke-hoach-trien-khai.md)).

## Danh sách dependency chính (tham khảo khi viết Dockerfile)

- `ros-humble-desktop`
- `ros-humble-ros-gz` (bridge ROS 2 ↔ Gazebo Fortress — không cài `ros-humble-gazebo-*` vì đó là Gazebo Classic)
- `ros-humble-ros2-control`, `ros-humble-ros2-controllers`, `ros-humble-gz-ros2-control`
- `ros-humble-slam-toolbox`
- `ros-humble-navigation2`, `ros-humble-nav2-bringup`
- `ros-humble-xacro`, `ros-humble-robot-state-publisher`, `ros-humble-joint-state-publisher-gui`
- `ros-humble-teleop-twist-keyboard`
- `python3-colcon-common-extensions`, `python3-rosdep`

## Kiểm tra môi trường (checklist cuối Module 0)

Học viên nên có 1 script `scripts/check_env.sh` chạy tự động kiểm tra:
- ROS 2 distro đúng (Humble)
- Gazebo version đúng (Fortress qua `ros_gz`, không phải Classic)
- `colcon build` chạy sạch không lỗi
- `gz sim` mở được cửa sổ (test GUI hoạt động)

Việc này giúp giảng viên/tài liệu không phải debug môi trường cho từng học viên riêng lẻ — tự động hóa bước "môi trường có sẵn sàng chưa" trước khi vào Module 1.
