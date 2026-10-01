# 2. `slam_toolbox` thực hành

*[← SLAM là gì](01-slam-nguyen-ly.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Lưu bản đồ →](03-luu-ban-do.md)*

## Định nghĩa

`slam_toolbox` là package SLAM mặc định của hệ sinh thái Nav2 (thay cho `gmapping`/`cartographer` cũ). Chế độ dùng ở module này: **`online_async`** — chạy song song với robot thời gian thực, xử lý bất đồng bộ (không bắt robot đứng chờ xử lý xong mới đi tiếp).

## Cơ chế

`atlas_slam/launch/slam.launch.py` không tự viết node SLAM — `include` thẳng launch file có sẵn của `slam_toolbox`:
```python
slam_toolbox_node = IncludeLaunchDescription(
    PythonLaunchDescriptionSource(os.path.join(slam_toolbox_share, "launch", "online_async_launch.py")),
    launch_arguments={
        "slam_params_file": os.path.join(slam_pkg_share, "config", "mapper_params.yaml"),
        "use_sim_time": "true",
    }.items(),
)
```
File duy nhất bạn thực sự chỉnh là `mapper_params.yaml`. Vài tham số quan trọng nhất để đọc hiểu (không cần nhớ hết — tra lại khi cần):

| Tham số | Ý nghĩa |
|---|---|
| `base_frame`, `odom_frame`, `map_frame` | Khớp đúng tên frame thật trong TF (Module 2) — sai tên, SLAM không chạy được dù mọi thứ khác đúng |
| `scan_topic` | Topic LiDAR, `/scan` theo convention REP đã dùng xuyên suốt |
| `minimum_travel_distance`/`heading` | Robot phải đi xa/quay đủ ngần này mới xử lý scan mới — nhỏ quá thì tốn CPU xử lý dư thừa, lớn quá thì map thưa, "bỏ sót" đoạn ngắn |
| `max_laser_range` | PHẢI nhỏ hơn giới hạn thật của cảm biến (Module 6) — tia gần giới hạn kém tin cậy |
| `do_loop_closing` | Bật/tắt cơ chế ở [bài trước](01-slam-nguyen-ly.md) — tắt khi KHÔNG muốn SLAM tự "sửa" bản đồ đã có (sẽ gặp lại dạng `mode: localization`, Module 9) |

`mode: mapping` là điểm khác biệt cốt lõi so với Module 9 (`mode: localization`) — cùng 1 package, 2 chế độ hoàn toàn khác mục đích: ở đây TẠO bản đồ mới, ở Module 9 CHỈ định vị trên bản đồ đã có, không được sửa nó.

## Ví dụ trong dự án Atlas

`atlas_slam/config/mapper_params.yaml` đã tinh chỉnh sẵn cho đúng quy mô Atlas (robot ~0.32×0.26m, world maze ~6×6m) — không phải file mặc định của `slam_toolbox` chép nguyên xi:
```yaml
min_laser_range: 0.12      # khớp range.min thật của LiDAR (atlas.gazebo.xacro), không phải 0.0
minimum_travel_distance: 0.2   # giảm so với mặc định 0.5 -- world nhỏ, cần cập nhật dày hơn
```
Đúng tinh thần "copy mặc định không đọc = dễ hỏng ở quy mô khác" — mỗi tham số lệch khỏi mặc định ở đây đều có lý do ghi lại trong comment, không phải số ngẫu nhiên.

## Thử ngay

```bash
# Terminal 1: bringup
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
# Terminal 2: SLAM + RViz
ros2 launch atlas_slam slam.launch.py
# Terminal 3: lái đi khắp world
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```
Quan sát RViz: bản đồ (ô xám = chưa biết, trắng = trống, đen = vật cản) hiện dần theo đường đi. Dừng lái 1 lúc — bản đồ KHÔNG đổi (đúng `minimum_travel_distance`, không xử lý khi đứng yên). Đi 1 vòng khép kín quay lại điểm cũ — quan sát khoảnh khắc loop closure kích hoạt (map có thể "giật" nhẹ 1 khung hình khi tối ưu lại).

---
*Tiếp theo: [Lưu bản đồ →](03-luu-ban-do.md)*
