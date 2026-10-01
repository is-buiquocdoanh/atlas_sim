# 1. URDF là gì

*[← Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Link →](02-link.md)*

## Định nghĩa

**URDF** (Unified Robot Description Format) là file XML mô tả robot cho ROS 2: robot gồm những **khối cứng** nào (`<link>`), các khối đó **nối với nhau ra sao** (`<joint>`). Chỉ có 2 thẻ chính đó — mọi thứ còn lại là chi tiết bên trong chúng.

**XACRO** (XML Macro) là lớp tiền xử lý đặt trên URDF: cho phép dùng biến, phép toán và macro. Lệnh `xacro` "trải phẳng" file `.xacro` thành URDF thuần rồi mới đưa cho ROS — ROS không hề biết xacro tồn tại.

## Cơ chế

Quan hệ với những gì đã học ở [Module 2](../module-02-tf2-toa-do/02-tf-tree.md):

| URDF | TF |
|---|---|
| `<link name="lidar_link">` | 1 **frame** tên `lidar_link` |
| `<joint>` cha→con + `<origin>` | 1 **transform** cha→con |
| Toàn bộ file URDF | Toàn bộ 1 nhánh **cây TF** |

Vì thế URDF **bắt buộc là cây**: mỗi link chỉ được làm con của đúng 1 joint. Khai 2 joint cùng trỏ tới 1 link → URDF không parse được (không phải lỗi chạy, là lỗi cấu trúc).

Điều URDF **không** mô tả: động cơ điều khiển thế nào (→ `ros2_control`, Module 5), cảm biến sinh dữ liệu ra sao (→ plugin Gazebo, Module 6), robot đang ở đâu trên bản đồ (→ SLAM/AMCL, Module 8-9). URDF chỉ trả lời "robot có hình dạng gì và các bộ phận gắn vào nhau ở đâu".

## Ví dụ trong dự án Atlas

`atlas_description` là package chỉ chứa URDF — cố ý **không** phụ thuộc Gazebo:

```
src/atlas_description/urdf/
├── atlas.urdf.xacro       # file chính: tham số + base_link + gọi các macro
├── wheel.xacro            # macro bánh chủ động + macro caster
├── sensors.xacro          # macro LiDAR + IMU (chỉ hình học, chưa có plugin)
├── inertial_macros.xacro  # công thức inertia cho hộp/trụ/cầu
└── materials.xacro        # bảng màu
```

Lý do tách 5 file: phần mô tả **robot** dùng lại được cho robot thật sau này, còn phần mô tả **mô phỏng** nằm ở package khác (`atlas_gazebo` include lại file này rồi thêm `<gazebo>` — xem [bài 6](06-doc-urdf-atlas.md)).

## Thử ngay

```bash
# "Trải phẳng" xacro thành URDF thuần rồi xem -- đây chính là thứ ROS thực sự nhận
xacro src/atlas_description/urdf/atlas.urdf.xacro > /tmp/atlas.urdf
head -40 /tmp/atlas.urdf

# Kiểm tra URDF hợp lệ + in ra cây link (công cụ của package urdf)
check_urdf /tmp/atlas.urdf
```

Kết quả `check_urdf` trên Atlas:
```
robot name is: atlas
root Link: base_footprint has 1 child(ren)
    child(1):  base_link
        child(1):  front_caster_link
        child(2):  imu_link
        child(3):  left_wheel_link
        child(4):  lidar_link
        child(5):  rear_caster_link
        child(6):  right_wheel_link
```
8 link, 7 joint — so với cây bạn tự vẽ ở [bài tập Module 2](../module-02-tf2-toa-do/05-bai-tap.md). Đây là lệnh đáng nhớ: URDF hỏng thì `check_urdf` báo ngay, không cần mở RViz đoán mò.

---
*Tiếp theo: [Link →](02-link.md)*
