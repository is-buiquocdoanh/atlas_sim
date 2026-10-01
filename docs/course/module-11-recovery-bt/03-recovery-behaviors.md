# 3. Recovery behaviors thật đang chạy

*[← Đọc BT XML](02-doc-bt-xml.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Bài tập →](04-bai-tap.md)*

## Định nghĩa

**Recovery behavior** là hành động robot tự thực hiện khi việc chính (tính đường/bám đường) thất bại — không phải "sửa lỗi", chỉ là thử tạo lại điều kiện để việc chính có cơ hội thành công ở lần thử tiếp theo.

## Cơ chế

`behavior_server` (node riêng, [đã thấy tên trong `navigation.launch.py` từ Module 9-10](../module-10-nav2-core/00-gioi-thieu.md)) nạp sẵn **4 plugin** — nhưng [BT mặc định](02-doc-bt-xml.md) chỉ thật sự GỌI 3 trong số đó qua `RoundRobin`:

| Behavior | Có trong BT mặc định? | Làm gì |
|---|---|---|
| `ClearEntireCostmap` | Có (2 lần, local + global) | Xóa sạch, tính lại costmap từ `/scan` mới nhất — "quên" vật cản có thể đã hết tồn tại |
| `Spin` | Có | Quay tại chỗ 1 góc (`spin_dist`) — giúp LiDAR quét thêm góc nhìn mới, thường đủ để costmap "thấy" đường thoát |
| `Wait` | Có | Đứng yên 1 khoảng thời gian — hữu ích khi vật cản là người/vật DI ĐỘNG, chờ nó tự đi khỏi |
| `BackUp` | Có | Lùi lại 1 đoạn ngắn, tốc độ chậm |
| `DriveOnHeading` | **Không** (nạp sẵn nhưng chưa node nào gọi) | Đi thẳng theo 1 hướng cho sẵn — khác `BackUp` (luôn lùi), có thể tiến |

`RoundRobin` xoay vòng — mỗi lần `ReactiveFallback` kích hoạt lại, thử hành vi KHÁC với lần trước (không lặp mãi đúng 1 cách nếu nó không hiệu quả).

## Ví dụ trong dự án Atlas

`atlas_slam/config/nav2_params_mppi.yaml` (chung cho cả 3 file controller):
```yaml
behavior_server:
  ros__parameters:
    behavior_plugins: ["spin", "backup", "drive_on_heading", "wait"]
    spin: {plugin: "nav2_behaviors/Spin"}
    backup: {plugin: "nav2_behaviors/BackUp"}
    drive_on_heading: {plugin: "nav2_behaviors/DriveOnHeading"}
    wait: {plugin: "nav2_behaviors/Wait"}
```
`drive_on_heading` đã NẠP SẴN, sẵn sàng dùng — chỉ cần thêm 1 node `<DriveOnHeading .../>` vào file BT XML là gọi được ngay, không cần sửa code Python/C++ nào, không cần thêm dòng cấu hình nào trong YAML. Đây chính xác là nội dung [bài tập](04-bai-tap.md).

## Thử ngay

```bash
ros2 launch atlas_bringup bringup.launch.py world:=maze.sdf
ros2 launch atlas_slam navigation.launch.py map:=$(pwd)/src/atlas_slam/maps/maze_map.yaml
```
```bash
ros2 node info /behavior_server | grep -A6 "Action Servers"
```
Xác nhận cả 4 action server (`spin`, `backup`, `drive_on_heading`, `wait`) đều tồn tại — kể cả `drive_on_heading` chưa được BT nào gọi, action server của nó vẫn chạy, sẵn sàng nhận lệnh bất cứ lúc nào.

---
*Tiếp theo: [Bài tập →](04-bai-tap.md)*
