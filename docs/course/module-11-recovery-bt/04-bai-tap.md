# 4. Bài tập: tạo tình huống kẹt, tùy chỉnh Behavior Tree

*[← Recovery behaviors](03-recovery-behaviors.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [BT vs state machine](01-behavior-tree-vs-state-machine.md), [Đọc BT XML](02-doc-bt-xml.md), [Recovery behaviors](03-recovery-behaviors.md).

## Phần A — Quan sát recovery tự kích hoạt

1. Gửi 1 goal ở phía bên kia 1 bức tường dài trong `maze.sdf` (buộc robot phải đi vòng xa).
2. Trong lúc robot đang di chuyển, mở Gazebo, **kéo thả 1 khối hộp** (từ thư viện có sẵn, hoặc `Insert` → `Box`) chặn ngang đúng đường robot sắp đi qua.
3. Quan sát terminal chạy `navigation.launch.py` — tìm log `ClearingActions`/`Spin`/`Wait`/`BackUp` (tên các node trong [BT XML](02-doc-bt-xml.md)) xuất hiện.
4. Ghi lại: recovery nào kích hoạt trước, robot có vượt qua được chướng ngại mới không, hay cuối cùng vẫn `FAILED` sau 6 lần thử ([bài 2](02-doc-bt-xml.md), `number_of_retries="6"`).

## Phần B — Tùy chỉnh Behavior Tree

1. Copy file BT mặc định ra vị trí riêng:
   ```bash
   mkdir -p src/atlas_slam/behavior_trees
   cp /opt/ros/humble/share/nav2_bt_navigator/behavior_trees/navigate_to_pose_w_replanning_and_recovery.xml \
      src/atlas_slam/behavior_trees/atlas_recovery.xml
   ```
2. Mở file vừa copy, thêm **`DriveOnHeading`** vào trong `<RoundRobin>` (xem lại [bài 3](03-recovery-behaviors.md) — plugin đã nạp sẵn, chỉ thiếu node gọi nó):
   ```xml
   <DriveOnHeading dist_to_travel="0.3" speed="0.1" time_allowance="5"/>
   ```
3. Trỏ `bt_navigator` dùng file mới — thêm vào `nav2_params_mppi.yaml` (khối `bt_navigator`):
   ```yaml
   default_nav_to_pose_bt_xml: "src/atlas_slam/behavior_trees/atlas_recovery.xml"
   ```
   (dùng đường dẫn tuyệt đối thật khi chạy — tương tự lưu ý về đường dẫn tuyệt đối đã gặp ở [`serialize_map`, Module 8](../module-08-slam/03-luu-ban-do.md)).
4. Lặp lại Phần A — `RoundRobin` giờ xoay qua **5** hành vi thay vì 4, xác nhận bằng cách đặt vật cản nhiều lần, chờ đủ lâu để thấy `DriveOnHeading` xuất hiện trong log.

## Gợi ý

- Robot "thất bại" sau 6 lần thử KHÔNG phải lỗi — đó là thiết kế có chủ đích (tránh robot kẹt vĩnh viễn, báo lại cho tầng trên biết để xử lý khác, vd thông báo người dùng).
- Nếu không thấy recovery kích hoạt dù đã chặn đường — kiểm tra lại vật cản có thật sự nằm trong tầm `/scan` không (Module 6), costmap có "thấy" nó không trước khi nghi ngờ BT.

## Tự kiểm tra

- [ ] Có log thật ghi lại ít nhất 2 recovery behavior khác nhau kích hoạt trong 1 lần kẹt.
- [ ] File `atlas_recovery.xml` chạy được, `bt_navigator` nạp đúng file mới (không rơi về file mặc định do đường dẫn sai).
- [ ] Quan sát được `DriveOnHeading` thật sự chạy (robot tiến 1 đoạn ngắn, không chỉ xem trong file XML).

## Tự kiểm tra trước khi qua Module 12

- [ ] Vẽ được (nói bằng lời) cấu trúc BT mặc định của Atlas từ gốc tới lá, không cần mở lại file.
- [ ] Giải thích được khác biệt `Sequence` và `Fallback`.
- [ ] Sửa được 1 BT XML và trỏ `bt_navigator` dùng file mới mà không cần sửa code.
- [ ] Giải thích được vì sao `RoundRobin` (xoay vòng) hợp lý hơn luôn thử đúng 1 cách khi robot kẹt.

Xong hết → sang **Module 12 — Waypoint following & Nav2 Simple Commander API**, nơi bạn tự viết code điều khiển Nav2 thay vì chỉ cấu hình nó *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 11 được duyệt).*
