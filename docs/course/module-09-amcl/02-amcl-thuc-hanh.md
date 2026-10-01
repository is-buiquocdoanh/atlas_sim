# 2. AMCL thực hành

*[← Particle Filter](01-particle-filter.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [AMCL vs slam_toolbox →](03-amcl-vs-slam-toolbox.md)*

## Định nghĩa

AMCL là node Nav2 chuẩn, nạp bản đồ qua `map_server` rồi tự định vị robot trên đó — khác `slam_toolbox` (Module 8), nó **không bao giờ sửa bản đồ**, chỉ ước lượng pose của robot.

## Cơ chế

AMCL **không bắt buộc biết pose ban đầu** — nếu không đặt gì, nó rải hạt khắp map (chờ bạn tự hội tụ bằng cách lái vòng vòng, rất chậm và không chắc đúng). Cách chuẩn: đặt **"2D Pose Estimate"** trong RViz — click vào vị trí ước lượng + kéo chỉ hướng — AMCL rải hạt tập trung QUANH điểm đó thay vì khắp map, hội tụ nhanh hơn nhiều.

Khác biệt bắt buộc-nhớ so với `slam_toolbox` ở Module 8 ([bài tiếp theo](03-amcl-vs-slam-toolbox.md) nói kỹ hơn): AMCL **không cần** pose đúng ngay lúc khởi động — đặt sai, lái vài bước, nó tự sửa. `mode: localization` của `slam_toolbox` thì **bắt buộc** đúng ngay từ lúc khởi động.

## Ví dụ trong dự án Atlas

`atlas_slam/launch/navigation.launch.py` mặc định `localization:=amcl` — khai báo tường minh `map_server` + `amcl` + `lifecycle_manager_localization` (không `include` gói sẵn của `nav2_bringup`, đúng triết lý "thấy rõ từng node" xuyên suốt dự án):
```python
amcl_localization_nodes = GroupAction(
    condition=IfCondition(is_amcl),
    actions=[
        Node(package="nav2_map_server", executable="map_server", ...),
        Node(package="nav2_amcl", executable="amcl", ...),
        Node(package="nav2_lifecycle_manager", executable="lifecycle_manager",
             parameters=[{"node_names": ["map_server", "amcl"]}]),
    ],
)
```
`lifecycle_manager_localization` tự chuyển `map_server`/`amcl` qua các trạng thái `configure → activate` — panel Nav2 trong RViz đọc đúng tên node `lifecycle_manager_localization` này để báo "Active"/"Inactive" (lý do quan trọng ở [bài so sánh tiếp theo](03-amcl-vs-slam-toolbox.md)).

## Thử ngay

```bash
# Terminal 1: bringup
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
# Terminal 2: Nav2 với AMCL (mặc định)
ros2 launch atlas_slam navigation.launch.py map:=$(pwd)/src/atlas_slam/maps/maze_map.yaml
```
Trong RViz: click **2D Pose Estimate**, đặt đúng vị trí robot (mặc định spawn tại gốc tọa độ). Quan sát đám mây hạt đỏ co dần lại. Lái vài bước bằng bàn phím — hạt càng tụm chặt hơn. Thử kiểm tra bằng CLI:
```bash
ros2 topic echo /amcl_pose --once      # pose ước lượng cuối cùng + ma trận hiệp phương sai
```
Hiệp phương sai càng nhỏ, AMCL càng "tự tin" vào ước lượng của nó.

---
*Tiếp theo: [AMCL vs slam_toolbox →](03-amcl-vs-slam-toolbox.md)*
