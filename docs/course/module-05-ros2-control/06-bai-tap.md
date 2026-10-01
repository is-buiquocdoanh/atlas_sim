# 6. Bài tập: tính tay vận tốc bánh rồi kiểm chứng

*[← Odometry & TF](05-odom-va-tf.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Động học vi sai](04-dong-hoc-vi-sai.md), [Odometry](05-odom-va-tf.md), [Hardware interface](02-hardware-interface.md).

Bài này là phần **rất hữu ích để đưa vào báo cáo đồ án**: có công thức, có số liệu đo, có so sánh lý thuyết với thực nghiệm.

## Phần A — tính tay TRƯỚC khi chạy

Atlas có `wheel_separation L = 0,30 m`, `wheel_radius r = 0,05 m`. Với lệnh:

```
v = 0,2 m/s      ω = 0,5 rad/s
```

Tính ra giấy, **chưa mở Gazebo**:
1. `v_trái` và `v_phải` (m/s).
2. `ω_trái` và `ω_phải` (rad/s) — đây là con số sẽ thấy trong `/joint_states`.
3. Bán kính quỹ đạo robot đi (gợi ý: `R = v/ω`). Robot vẽ ra đường tròn bán kính bao nhiêu?
4. Nếu đổi `ω` thành `−0,5`, hai bánh đổi vai trò thế nào?

Giờ mới kiểm chứng:
```bash
ros2 launch atlas_control controller.launch.py
```
```bash
# terminal 2
ros2 topic pub -r 10 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.2}, angular: {z: 0.5}}"
# terminal 3
ros2 topic echo /joint_states --once
```
So `velocity` trong `/joint_states` với đáp án câu 2. Lệch dưới vài phần trăm là đạt (có trượt bánh và trễ điều khiển).

Kiểm chứng câu 3 bằng mắt: để robot chạy 20-30 giây trong `empty.sdf`, quan sát đường tròn nó vẽ ra, so với `R` đã tính.

## Phần B — phá sự khớp nhau giữa URDF và YAML

Đây là lỗi thật, hay gặp nhất khi tự sửa robot.

1. Đổi `wheel_radius` trong `atlas_description/urdf/atlas.urdf.xacro` từ `0.05` thành `0.10`.
2. **Không** sửa `atlas_control/config/diff_drive_controller.yaml` (vẫn để `0.05`).
3. Build lại, chạy, ra lệnh `v = 0,2 m/s` đi thẳng.

Trả lời:
- Robot chạy **nhanh hơn hay chậm hơn** 0,2 m/s? Gấp mấy lần? Vì sao?
- `/odom` báo cáo quãng đường đúng hay sai? Sai theo hướng nào?
- Đo thử: cho robot chạy 10 giây rồi so `/odom` với vị trí thật trong Gazebo (panel Entity tree → chọn `atlas` → xem pose).

Sau đó sửa YAML cho khớp, chạy lại, xác nhận sai lệch biến mất. Ghi lại cả 2 bộ số.

```bash
git checkout src/atlas_description src/atlas_control   # khôi phục
```

## Phần C — đo drift của odometry

| Kịch bản | Cách chạy | Đo gì |
|---|---|---|
| 1. Quay tại chỗ 60 s | `angular: {z: 1.0}` | `x`, `y` trong `/odom` lệch bao nhiêu so với 0? |
| 2. Đi thẳng 5 m rồi lùi về | `linear: {x: 0.3}` rồi `-0.3` | Về đúng `(0,0)` không? Lệch bao nhiêu? |
| 3. Đi một vòng vuông về chỗ cũ | teleop hoặc 4 lệnh liên tiếp | Sai số tích lũy tổng cộng |

Với mỗi kịch bản, ghi lại sai số tuyệt đối và **tỉ lệ sai số trên quãng đường đã đi**. Nhận xét: sai số tăng theo thời gian, theo quãng đường, hay theo số lần quay?

Kết luận rút ra ở đây là nền cho Module 8-9 — hãy viết thành 2-3 câu, sẽ dùng lại được nguyên văn trong báo cáo.

## Phần D — quan sát lớp an toàn

1. **`cmd_vel_timeout`**: cho robot chạy bằng `ros2 topic pub` (không có `-r`, tức chỉ gửi 1 lần) và đếm xem bao lâu thì robot tự dừng. So với `cmd_vel_timeout: 0.5` trong config.
2. **Giới hạn gia tốc**: ra lệnh `linear.x: 0.5` đột ngột từ trạng thái đứng yên, `echo /odom` liên tục xem robot mất bao lâu để đạt tốc độ đó. So với `max_acceleration: 1.0` (lý thuyết: 0,5 s).
3. **Giới hạn vận tốc**: ra lệnh `linear.x: 5.0`, xác nhận `/odom` không bao giờ vượt 0,5 m/s.

## Nộp bài

- Trang giấy/ảnh chụp phần tính tay (phần A) + ảnh `/joint_states` để đối chiếu.
- Bảng phần B: 2 bộ số (sai config vs đúng config), kèm giải thích.
- Bảng phần C: 3 kịch bản, sai số đo được, và 2-3 câu nhận xét.
- Kết quả phần D: 3 con số đo được so với 3 giá trị trong config.

## Tự kiểm tra trước khi qua Module 6

- [ ] Vẽ lại được sơ đồ 3 tầng `ros2_control` và nói đúng việc của từng tầng.
- [ ] Giải thích được vì sao chuyển sang robot thật chỉ cần đổi tầng hardware interface.
- [ ] Phân biệt được controller và broadcaster, và vì sao chúng chạy được song song trên cùng khớp.
- [ ] Viết được công thức động học vi sai cả 2 chiều mà không cần tra lại.
- [ ] Giải thích được vì sao odometry mượt nhưng trôi, và vì sao điều đó dẫn tới việc tách `map`/`odom`.
- [ ] Chẩn đoán được ngay khi spawner treo ở `waiting for service /controller_manager/...`.
- [ ] Biết `use_stamped_vel` gây ra lỗi gì và nhận ra triệu chứng "mọi thứ đúng nhưng robot đứng im".

Xong hết → sang [**Module 6 — Cảm biến: LiDAR & IMU**](../module-06-cam-bien/00-gioi-thieu.md), nơi robot bắt đầu "nhìn thấy" môi trường thay vì chỉ đếm vòng quay bánh xe.
