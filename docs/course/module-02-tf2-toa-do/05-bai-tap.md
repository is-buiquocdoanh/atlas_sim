# 5. Bài tập: vẽ tay TF tree của Atlas

*[← Công cụ debug](04-cong-cu-debug.md) · [Mục lục module](00-gioi-thieu.md)*

Áp dụng [Frame/Transform](01-frame-va-transform.md), [TF tree](02-tf-tree.md), [REP-105](03-rep103-rep105.md) — **làm bài này TRƯỚC khi đọc Module 3** (nơi URDF thật của Atlas sẽ "lộ" đáp án).

## Yêu cầu

Atlas là robot diff-drive gồm: 1 khung chính, 2 bánh chủ động (trái/phải), 1 bánh đỡ (caster) phía trước, 1 LiDAR gắn trên khung, 1 IMU gắn trên khung. Các frame sẽ có tên: `base_link`, `wheel_left`, `wheel_right`, `caster`, `lidar_link`, `imu_link`.

**Vẽ tay** (giấy hoặc công cụ vẽ bất kỳ) cây TF dự kiến, trả lời được:
1. Frame nào là **cha** của `wheel_left`, `wheel_right`, `caster`, `lidar_link`, `imu_link`? (gợi ý: đọc lại quy tắc "1 frame chỉ có đúng 1 cha" ở [bài TF tree](02-tf-tree.md) — tất cả các frame trên có cùng 1 cha hay khác nhau?)
2. Joint nối `base_link` → `wheel_left`/`wheel_right` nên là loại chuyển động được hay cố định? Còn `base_link` → `lidar_link`?
3. Nếu robot đứng yên tại chỗ nhưng 2 bánh vẫn quay (kẹt trên mặt trơn), transform `base_link` → `wheel_left` có đổi theo thời gian không? Transform `map` → `base_link` có đổi không?

## Gợi ý (không phải đáp án)

- `map` và `odom` ([bài REP-105](03-rep103-rep105.md)) KHÔNG nằm trong danh sách frame cần vẽ ở bài này — chúng chỉ xuất hiện khi có `slam_toolbox`/`amcl` chạy (Module 8-9), chưa liên quan tới URDF tĩnh của robot.
- LiDAR và IMU không di chuyển so với khung robot — liên hệ với ví dụ `static_transform_publisher` ở [bài Công cụ debug](04-cong-cu-debug.md).
- Bánh xe QUAY nhưng vị trí GẮN của trục bánh trên khung thì không đổi — phân biệt "transform đổi vì khớp xoay" và "transform đổi vì cả cụm bánh xê dịch".

## Tự kiểm tra

- [ ] Vẽ được 1 cây (không phải danh sách rời rạc) — mỗi frame có đúng 1 mũi tên cha trỏ tới.
- [ ] Trả lời được câu 1-3 ở trên, giải thích được lý do (không chỉ đoán).
- [ ] Sau khi đọc Module 3 (URDF thật), so cây tự vẽ với `atlas_description/urdf/atlas.urdf.xacro` — chỗ nào đoán sai, hiểu được vì sao.

## Tự kiểm tra trước khi qua Module 3

- [ ] Giải thích được frame khác transform ở điểm nào.
- [ ] Vẽ được cây TF bất kỳ (không cần đúng của Atlas) chỉ từ mô tả bằng lời 1 robot khác.
- [ ] Dùng được `view_frames` + `tf2_echo` để debug 1 launch file TF bất kỳ, không cần nhớ cú pháp (tra lại [bài Công cụ debug](04-cong-cu-debug.md)).
- [ ] Giải thích được (không cần thuộc lòng công thức) vì sao `map`→`odom` nhảy bậc còn `odom`→`base_link` mượt, và hậu quả nếu gộp làm một.

Xong hết → sang **Module 3 — Mô hình hóa robot với URDF/XACRO** *(nội dung chi tiết sẽ viết theo cùng cấu trúc, sau khi Module 2 được duyệt).*
