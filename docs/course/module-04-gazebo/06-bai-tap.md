# 6. Bài tập: robot đứng vững & phá vật lý có chủ đích

*[← ros_gz_bridge](05-ros-gz-bridge.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Vật lý & inertia](02-vat-ly-inertia.md), [World file](03-world-file.md), [Spawn](04-spawn-robot.md), [Bridge](05-ros-gz-bridge.md).

Mục tiêu kép: (1) xác nhận robot đứng vững đúng chuẩn, (2) **tự tay gây ra từng lỗi vật lý phổ biến** để sau này nhận mặt triệu chứng trong 10 giây thay vì nửa buổi.

## Phần A — xác nhận robot đứng vững

```bash
colcon build --packages-select atlas_description atlas_gazebo && source install/setup.bash
ros2 launch atlas_gazebo spawn_robot.launch.py
```

Tiêu chuẩn đạt, kiểm tra đủ 4 điểm:

- [ ] Robot rơi xuống sàn và **đứng yên hoàn toàn** trong vòng 1-2 giây, không rung, không trôi ngang.
- [ ] Cả 2 bánh và 2 caster **chạm sàn** (bật View → Collisions để nhìn rõ), thân robot không chạm.
- [ ] **RTF ≈ 1.0** (nếu máy yếu, ghi lại giá trị thật — sẽ cần biết ở Module 8).
- [ ] `/clock` chạy, cây TF đủ 8 frame:
```bash
ros2 topic echo /clock --once
ros2 run tf2_tools view_frames
```

Robot trôi chậm một chỗ dù không ai điều khiển? Đó là hiện tượng bình thường của bộ giải khi có nhiều điểm tiếp xúc ma sát 0 — ghi lại tốc độ trôi, sẽ so lại sau khi có controller ở Module 5.

## Phần B — gây lỗi có chủ đích

Mỗi trường hợp: **đoán triệu chứng trước**, chạy, ghi lại thứ thật sự xảy ra, rồi khôi phục.

| # | Thay đổi | File | Đoán xem |
|---|---|---|---|
| 1 | `wheel_mass`: `0.3` → `0.000001` | `atlas.urdf.xacro` | Bánh xe còn đỡ nổi thân 5 kg không? |
| 2 | Đặt `<inertia>` của `base_link` toàn `0.0` (sửa tạm trong `inertial_macros.xacro`) | `inertial_macros.xacro` | Robot phản ứng thế nào với lực nhỏ nhất? |
| 3 | `mu1`/`mu2` của 2 bánh: `1.0` → `0.0` | `atlas.gazebo.xacro` | Robot đứng yên hay trượt? Khác gì với caster? |
| 4 | `mu1`/`mu2` của 2 caster: `0.0` → `1.0` | `atlas.gazebo.xacro` | Điều gì xảy ra khi robot cố quay tại chỗ (Module 5 sẽ thấy rõ hơn)? |
| 5 | `max_step_size`: `0.001` → `0.05` | `worlds/empty.sdf` | Robot có còn ở trên sàn không? |
| 6 | Xóa `gz-sim-physics-system` | `worlds/empty.sdf` | Robot rơi hay lơ lửng? |
| 7 | Xóa `gz-sim-user-commands-system` | `worlds/empty.sdf` | Robot có xuất hiện trong world không? Log báo gì? |
| 8 | Bỏ cờ `-r` trong `gz_args` | `spawn_robot.launch.py` | `/clock` còn nhích không? |

Với mỗi trường hợp, ghi vào bảng: **triệu chứng nhìn thấy** → **log/lệnh nào giúp xác định nguyên nhân**.

Lưu ý phân biệt 3 triệu chứng dễ nhầm nhau:
- Lơ lửng bất động (#6): thiếu plugin physics.
- Đứng im nhưng `/clock` không chạy (#8): mô phỏng đang pause.
- Robot không có mặt trong world (#7): spawn thất bại, nhưng `robot_state_publisher` vẫn chạy nên RViz vẫn thấy robot — **RViz thấy không có nghĩa là Gazebo có**.

```bash
git checkout src/atlas_description src/atlas_gazebo   # khôi phục sau khi xong
```

## Phần C — world của riêng bạn

Tạo `src/atlas_gazebo/worlds/my_world.sdf` từ `empty.sdf`, thêm ít nhất:
- 1 vật cản **tĩnh** (`<static>true</static>`) — vd hộp, trụ.
- 1 vật cản **động** (có `<inertial>` với mass hợp lý) mà robot có thể đẩy đi được.

```bash
colcon build --packages-select atlas_gazebo && source install/setup.bash
ros2 launch atlas_gazebo spawn_robot.launch.py world:=my_world.sdf
```

Kéo robot bằng chuột (công cụ Translate) đâm vào 2 vật cản, so sánh phản ứng. Giữ lại world này — Module 6 sẽ dùng chính nó để xem `/scan` phản ánh vật cản như thế nào.

## Nộp bài

- Ảnh chụp Gazebo: robot đứng vững trong `empty.sdf` và trong `maze.sdf`, có thấy chỉ số RTF.
- Bảng phần B: 8 dòng, mỗi dòng gồm thay đổi → triệu chứng thật → cách phát hiện.
- File `my_world.sdf` + ảnh chụp robot đẩy vật cản động.

## Tự kiểm tra trước khi qua Module 5

- [ ] Nói được Gazebo Fortress khác Gazebo Classic ở những điểm nào, và nhận ra ngay một tutorial trên mạng đang dùng bản nào.
- [ ] Giải thích được vì sao `ros2 topic list` không thấy hết topic của Gazebo.
- [ ] Biết `<collision>`, `<inertial>`, `mu1/mu2` ảnh hưởng tới cái gì, và đọc được triệu chứng ngược lại ra nguyên nhân.
- [ ] Kể được 3 plugin hệ thống bắt buộc trong world và hậu quả khi thiếu từng cái.
- [ ] Giải thích được vì sao spawn bằng `-topic robot_description` an toàn hơn `-file`.
- [ ] Giải thích được `use_sim_time` để làm gì và vì sao sai nó lại chỉ nổ ở Module 8-10.

Xong hết → sang [**Module 5 — Điều khiển với ros2_control**](../module-05-ros2-control/00-gioi-thieu.md), nơi robot bắt đầu **di chuyển** bằng `/cmd_vel` và ma sát bạn vừa cấu hình quyết định nó đi được hay quay tít tại chỗ.
