# 4. XACRO — property, macro, include

*[← Joint](03-joint.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [robot_state_publisher →](05-robot-state-publisher.md)*

## Định nghĩa

**XACRO** là bộ tiền xử lý XML cho URDF, cung cấp 3 thứ URDF thuần không có: **`<xacro:property>`** (hằng số + biểu thức toán), **`<xacro:macro>`** (khối XML tái sử dụng, có tham số), **`<xacro:include>`** (tách file).

File phải khai namespace ở thẻ gốc:
```xml
<robot name="atlas" xmlns:xacro="http://www.ros.org/wiki/xacro">
```

## Cơ chế

**Property** — đặt tên cho một con số, dùng lại bằng `${...}`. Trong `${}` viết được biểu thức Python-like, kể cả `pi`:
```xml
<xacro:property name="wheel_radius" value="0.05"/>
...
<origin xyz="0 0 ${wheel_radius}"/>
<origin xyz="0 0 ${base_height + lidar_height / 2}"/>
<origin rpy="${pi/2} 0 0"/>
```

**Macro** — hàm sinh XML. `params` liệt kê tham số; tiền tố `*` nghĩa là tham số đó nhận cả 1 khối XML con, chèn lại bằng `<xacro:insert_block>`:
```xml
<xacro:macro name="atlas_wheel" params="prefix reflect">
  <link name="${prefix}_wheel_link"> ... </link>
  <joint name="${prefix}_wheel_joint" type="continuous">
    <origin xyz="0 ${reflect * wheel_separation / 2} 0"/>
  </joint>
</xacro:macro>

<xacro:atlas_wheel prefix="left"  reflect="1"/>
<xacro:atlas_wheel prefix="right" reflect="-1"/>
```
Hai bánh xe = 2 dòng gọi thay vì ~35 dòng lặp. Sửa bánh xe chỉ sửa 1 chỗ, không bao giờ có chuyện "sửa bánh trái quên bánh phải".

**Include** — `<xacro:include filename="$(find atlas_description)/urdf/wheel.xacro"/>`. Dùng `$(find <package>)` thay vì đường dẫn tuyệt đối, để file chạy được trên máy người khác.

**Thứ tự xử lý là điểm bẫy quan trọng**: xacro trải file từ trên xuống. Một `<link>` viết trực tiếp trong file được include sẽ bị xử lý **ngay lúc include**, khi các property khai báo bên dưới chưa tồn tại → lỗi "property chưa định nghĩa". Bọc nội dung file include trong `<xacro:macro>` thì tránh được: thân macro chỉ được trải khi **gọi** macro, lúc đó property đã có giá trị. Đây đúng là lý do `sensors.xacro` của Atlas bọc LiDAR + IMU trong `<xacro:macro name="atlas_sensors">` rồi mới gọi `<xacro:atlas_sensors/>` ở cuối file chính.

## Ví dụ trong dự án Atlas

Toàn bộ kích thước robot gom vào một khối property ở đầu `atlas.urdf.xacro` — đổi robot mà không đụng logic:

```xml
<xacro:property name="base_length" value="0.30"/>
<xacro:property name="base_width"  value="0.24"/>
<xacro:property name="base_height" value="0.12"/>
<xacro:property name="wheel_radius" value="0.05"/>
<xacro:property name="wheel_separation" value="0.30"/>
```

Một tham số chảy sang nhiều nơi, và đây mới là giá trị thật của xacro:
`wheel_radius` quyết định (1) bán kính hình trụ bánh xe, (2) chiều cao `base_joint` nâng `base_link` khỏi mặt đất, (3) độ cao đặt caster `${-wheel_radius + caster_radius}`. Đổi 1 số, cả 3 chỗ tự khớp — robot vẫn chạm đất đúng. Viết URDF thuần thì phải nhớ sửa cả 3, quên 1 chỗ là robot lún xuống sàn hoặc lơ lửng.

Ba macro trong `inertial_macros.xacro` (`inertial_box`, `inertial_cylinder`, `inertial_sphere`) cùng dùng tham số `*origin`, nên mọi link của Atlas có inertia đúng công thức mà không link nào phải viết lại `<inertia ixx=... iyy=... izz=.../>`.

## Thử ngay

```bash
# Xem kết quả trải phẳng -- macro đã biến mất, chỉ còn link/joint thuần
xacro src/atlas_description/urdf/atlas.urdf.xacro | grep -A6 'name="left_wheel_joint"'

# So số dòng: file nguồn vs URDF sinh ra
wc -l src/atlas_description/urdf/*.xacro
xacro src/atlas_description/urdf/atlas.urdf.xacro | wc -l
```

Thử cố tình gây lỗi để nhận mặt thông báo: đổi `${wheel_radius}` thành `${wheel_radiuss}` rồi chạy lại `xacro` → thông báo chỉ rõ property không tồn tại. Lỗi xacro luôn xuất hiện ở bước này, **trước** khi ROS khởi động, nên cứ chạy `xacro` tay mỗi khi sửa URDF là cách debug nhanh nhất.

---
*Tiếp theo: [robot_state_publisher →](05-robot-state-publisher.md)*
