# 4. `bt_navigator` — ai điều phối ai

*[← Local controller](03-local-controller.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Gửi goal →](05-gui-cli-goal.md)*

## Định nghĩa

`bt_navigator` là node ĐIỀU PHỐI — nhận goal, gọi `planner_server` tính đường, gọi `controller_server` bám đường, gọi `behavior_server` khi gặp sự cố (Module 11) — theo đúng kịch bản mô tả trong **1 file XML behavior tree**, không phải code cứng trong node.

## Cơ chế

Không tự viết điều phối bằng code (if/else lồng nhau) — Nav2 dùng **Behavior Tree** (XML mô tả 1 cây hành vi, đọc từ trên xuống, trái sang phải): mỗi "lá" là 1 hành động cụ thể (gọi planner, gọi controller...), các nút cha quyết định thứ tự/điều kiện chạy con. Lợi ích: đổi kịch bản điều hướng = sửa file XML, không build lại code — bạn sẽ tự sửa 1 file như vậy ở Module 11.

Module này chỉ cần biết: `bt_navigator` tồn tại và **không tự mình tính toán gì cả** — mọi "trí thông minh" nằm ở planner/controller/behavior, nó chỉ gọi đúng thứ tự.

## Ví dụ trong dự án Atlas

`atlas_slam/launch/navigation.launch.py` khai `bt_navigator` như mọi node Nav2 khác, dùng file BT mặc định đi kèm Nav2 (chưa tùy chỉnh ở module này):
```python
Node(package="nav2_bt_navigator", executable="bt_navigator", name="bt_navigator", ...)
```
Action `NavigateToPose` (gửi goal, [bài tiếp theo](05-gui-cli-goal.md)) chính là lời gọi TỚI `bt_navigator` — không phải tới planner hay controller trực tiếp. Đây là lý do action này có `controller_id`/`planner_id` để CHỌN plugin, nhưng bản thân người gọi không cần biết chi tiết bên trong chạy thế nào.

## Thử ngay

```bash
ros2 node list | grep bt_navigator
ros2 node info /bt_navigator | grep -A3 "Action Servers"
```
Xác nhận `/navigate_to_pose` nằm trong danh sách Action Server của chính `bt_navigator` — không phải của `controller_server` hay `planner_server`.

---
*Tiếp theo: [Gửi goal →](05-gui-cli-goal.md)*
