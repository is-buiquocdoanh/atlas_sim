# 3. World file (SDF)

*[← Vật lý & inertia](02-vat-ly-inertia.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Spawn robot →](04-spawn-robot.md)*

## Định nghĩa

**World file** là file `.sdf` mô tả *môi trường* robot sống trong đó: mặt sàn, tường, vật cản, nguồn sáng, tham số bộ giải vật lý, và danh sách **plugin hệ thống** mà gz-sim phải nạp.

**SDF** (Simulation Description Format) là anh em của URDF nhưng mô tả được cả thế giới, không chỉ 1 robot. Robot viết bằng URDF được `sdformat` tự chuyển sang SDF khi spawn — nên bạn viết URDF, Gazebo thấy SDF.

## Cơ chế

Một world tối thiểu cần 4 phần:

```xml
<sdf version="1.9">
  <world name="atlas_empty">
    <plugin filename="gz-sim-physics-system" .../>          <!-- 1. plugin hệ thống -->
    <physics name="1ms" type="ode">                          <!-- 2. tham số bộ giải -->
      <max_step_size>0.001</max_step_size>
      <real_time_factor>1.0</real_time_factor>
    </physics>
    <light type="directional" name="sun"> ... </light>       <!-- 3. ánh sáng -->
    <model name="ground_plane"> ... </model>                 <!-- 4. mặt sàn -->
  </world>
</sdf>
```

**Plugin hệ thống là phần hay bị bỏ sót nhất.** gz-sim không bật sẵn gì cả; mỗi năng lực là một plugin phải khai tường minh:

| Plugin | Không có nó thì |
|---|---|
| `gz-sim-physics-system` | Không có trọng lực, không va chạm — mọi vật đứng yên lơ lửng |
| `gz-sim-scene-broadcaster-system` | Không nhìn thấy gì trong cửa sổ GUI |
| `gz-sim-sensors-system` | LiDAR/camera không phát dữ liệu (Module 6) |
| `gz-sim-imu-system` | IMU không phát dữ liệu |
| `gz-sim-user-commands-system` | Không spawn/xóa được model lúc đang chạy — **`ros_gz_sim create` sẽ im lặng thất bại** |

`<physics>`: `max_step_size` 0.001 nghĩa là bộ giải tính lại 1000 lần cho mỗi giây mô phỏng. `real_time_factor` 1.0 là *yêu cầu* chạy bằng tốc độ thật; máy yếu không đáp ứng nổi thì RTF thực tế tụt xuống, mô phỏng chạy chậm lại chứ không sai.

## Ví dụ trong dự án Atlas

3 world trong `atlas_gazebo/worlds/`, dùng ở các module khác nhau:

| World | Nội dung | Dùng ở |
|---|---|---|
| `empty.sdf` | Chỉ sân + đèn, sân `mu = 1.0`, 100×100 m | Module 4-5: kiểm tra robot đứng/chạy |
| `maze.sdf` | 4 tường bao 7×5 m + 3 vách ngăn trong, cao 0,5 m | Module 7-8: lái tay, SLAM |
| `warehouse.sdf` | Tường bao + 6 kệ hàng xếp 3 hàng | Module 10 + capstone |

Ba world đều khai **cùng một bộ plugin hệ thống** và cùng khối `<gui>` — cố ý lặp, để mỗi file tự chạy độc lập được, học viên mở file nào cũng có trải nghiệm giống nhau.

Tường maze cao **0,5 m**: đủ cao để LiDAR (tâm quét nằm ở 0,19 m so với mặt đất: 0,05 bánh + 0,12 thân + 0,02 nửa vỏ LiDAR) luôn quét trúng, đủ thấp để nhìn toàn cảnh mê cung từ camera trên cao. Chiều cao tường là thứ ảnh hưởng trực tiếp tới chất lượng bản đồ SLAM ở Module 8 — tường thấp hơn tia quét thì robot "không thấy" tường.

Một chi tiết hữu ích trong khối `<gui>`: plugin **`VisualizeLidar`** được khai sẵn. Mặc định gz-sim không vẽ tia laser dù `<visualize>true</visualize>` trong URDF — cờ đó chỉ báo cho client, còn muốn thấy tia thì phải bật panel. Khai sẵn trong world để học viên Module 6 khỏi phải biết mẹo này.

Toàn bộ world đều tự viết bằng hình hộp đơn giản, **không tải model từ Fuel** (kho model online của Gazebo): repo chạy được offline, và lần khởi động đầu không phải chờ tải vài trăm MB.

## Thử ngay

```bash
ros2 launch atlas_gazebo spawn_robot.launch.py world:=maze.sdf
ros2 launch atlas_gazebo spawn_robot.launch.py world:=warehouse.sdf
ros2 launch atlas_gazebo spawn_robot.launch.py world:=maze.sdf x:=-2.5 y:=-2.0
```

Thêm một vật cản của riêng bạn: copy `empty.sdf` thành `my_world.sdf`, thêm trước `</world>`:
```xml
<model name="box_obstacle">
  <static>true</static>
  <pose>1.5 0 0.25 0 0 0</pose>
  <link name="link">
    <collision name="collision"><geometry><box><size>0.4 0.4 0.5</size></box></geometry></collision>
    <visual name="visual"><geometry><box><size>0.4 0.4 0.5</size></box></geometry></visual>
  </link>
</model>
```
`<static>true</static>` nghĩa là vật đứng yên bất chấp va chạm — không cần `<inertial>`. Bỏ dòng đó đi mà không thêm khối lượng thì Gazebo sẽ xử lý vật như có khối lượng mặc định và nó có thể bị robot đẩy đi.

Thử phá vật lý ở cấp world: xóa dòng `gz-sim-physics-system` trong world, chạy lại → robot đứng lơ lửng đúng chỗ spawn, không rơi. Đó là triệu chứng "thiếu plugin", rất khác với triệu chứng "inertia sai" ở [bài 2](02-vat-ly-inertia.md).

---
*Tiếp theo: [Spawn robot →](04-spawn-robot.md)*
