# Nguồn gốc asset trong thư mục này

2 bộ asset AWS RoboMaker, cả 2 đều phát hành theo giấy phép Apache License 2.0:
- `aws_robomaker_warehouse_*` -- **AWS RoboMaker Small Warehouse World**
  (`aws-robotics/aws-robomaker-small-warehouse-world`). Dùng trong `worlds/warehouse.sdf`.
- `aws_robomaker_residential_*` -- **AWS RoboMaker Small House World**
  (`aws-robotics/aws-robomaker-small-house-world`). Dùng trong `worlds/office.sdf` (bàn ghế/nội
  thất văn phòng -- gói warehouse không có bàn ghế riêng, chỉ có kệ hàng).

Thay cho các khối hộp màu phẳng tự vẽ ban đầu -- cho world nhìn giống thật (kệ pallet racking,
bàn ghế văn phòng, sàn có vạch kẻ, tường cao đủ 1 tầng), thay vì hình học tối giản chỉ đúng kích
thước mà không đúng hình dáng.

## Danh sách model đã copy vào đây

| Model | Dùng làm gì |
|---|---|
| `aws_robomaker_warehouse_GroundB_01` | Sàn (dùng chung cho cả warehouse.sdf và office.sdf) -- có vạch kẻ lối đi thật |
| `aws_robomaker_warehouse_WallB_01` | Khung tường 4 mặt -- **thiết kế khớp sẵn** với đúng chân đế của `GroundB_01` (cùng kích thước ~14m x 21m), không phải 2 model độc lập |
| `aws_robomaker_warehouse_ShelfF_01` | Kệ pallet racking 3 tầng, dài ~18m -- `warehouse.sdf`, 2 dãy dọc nhà kho |
| `aws_robomaker_warehouse_DeskC_01` | Bàn làm việc/bàn họp -- `office.sdf` |
| `aws_robomaker_warehouse_PalletJackB_01`, `TrashCanC_01` | Set dressing `warehouse.sdf`, không phải vật cản bài tập |
| `aws_robomaker_residential_ChairD_01` | Ghế -- `office.sdf` |
| `aws_robomaker_residential_ReadingDesk_01` | Bàn trà/bàn phụ -- `office.sdf`, gốc Z lệch tâm, đặt pose.z=+0.266 |
| `aws_robomaker_residential_Board_01` | Bảng treo tường phòng họp -- `office.sdf` |
| `aws_robomaker_residential_Refrigerator_01` | Tủ lạnh phòng nghỉ -- `office.sdf`, gốc Z lệch tâm, pose.z=+0.42 |
| `aws_robomaker_residential_CookingBench_01` | Bàn bếp nhỏ phòng nghỉ -- `office.sdf`, gốc Z lệch tâm, pose.z=+0.5 |
| `aws_robomaker_residential_TVCabinet_01` | Tủ pantry -- `office.sdf` |
| `aws_robomaker_residential_Trash_01` | Thùng rác -- `office.sdf` |
| `aws_robomaker_residential_SofaB_01` | Sofa sảnh lễ tân -- `office.sdf` |
| `aws_robomaker_residential_CoffeeTable_01` | Bàn cà phê sảnh lễ tân -- `office.sdf` |
| `aws_robomaker_residential_Vase_01` | Chậu cây -- `office.sdf`, gốc Z lệch tâm, pose.z=+0.647 |
| `aws_robomaker_residential_Wardrobe_01` | Tủ nhỏ phòng quản lý -- `office.sdf`, gốc Z lệch tâm, pose.z=+0.127, gốc Y lệch (không đối xứng, xem comment trong office.sdf) |
| `aws_robomaker_residential_ShoeRack_01` | Kệ lưu trữ khu làm việc -- `office.sdf`, **đã vá lỗi** (xem dưới) |
| Còn lại (`ShelfD/E_01`, `ClutteringA/C/D_01`, `Lamp_01`, `RoofB_01`, `Bucket_01`) | Chưa dùng tới -- để sẵn nếu sau này mở rộng world |

**Lưu ý thật gặp khi dùng gói `residential`**: vài model (`ChairA_01`, `KitchenTable_01`,
`KitchenCabinet_01`, `Sofa_01`, `SofaC_01`) có bounding box đo ra PHI THỰC TẾ (cao/rộng hàng chục
mét) -- lỗi xuất file gốc, không phải lỗi quy đổi đơn vị của mình -- đã KHÔNG dùng các model này,
chỉ dùng model đã tự đo và xác nhận kích thước hợp lý (xem bảng trên).

**2 lỗi file gốc khác đã vá trực tiếp trong bản copy ở đây** (không phải lỗi do mình gây ra, nhưng
phải tự sửa để world load được):
- `ShoeRack_01/model.sdf`: khối `<inertia>` gốc có 2 thẻ `<ixx>` trùng nhau và THIẾU hẳn `<izz>`
  -- khiến Gazebo từ chối load cả world với lỗi `Error Code 18: A link named link has invalid
  inertia`, không chỉ riêng model này. Đã thêm `<izz>0.04</izz>` đúng chỗ.
- Nhiều model (`SofaB_01`, `Vase_01`, `ReadingDesk_01`, `CookingBench_01`, `ChairD_01`,
  `Trash_01`) thiếu hẳn thẻ `<static>1</static>` -- nghĩa là vật lý coi chúng là vật thể ĐỘNG, có
  thể bị trôi/đổ theo thời gian dù chỉ là đồ trang trí. Đã thêm `<static>1</static>` cho đồng bộ
  với các model khác.

## Toạ độ/kích thước thật đã đo, không đoán

Đo bằng cách parse trực tiếp `<float_array>` toạ độ đỉnh trong file `.DAE` (đơn vị gốc file khai
centimeter, quy đổi mét) trước khi đặt pose trong world -- không scale méo tỉ lệ thật của asset
(chỉ scale Z đồng nhất cho tường/kệ để hạ chiều cao theo phản hồi thực tế, xem comment trong từng
world file). Xem comment ngay phía trên khối `<include>` trong `warehouse.sdf`/`office.sdf` để
biết đúng số đo và lý do chọn toạ độ.

## Gotcha thật: mặt sàn GroundB_01 không nằm ở z=0

Mesh sàn có đế dày ~12.4cm -- mặt TRÊN (chỗ robot thật sự đứng) nằm ở z=0.12432m, không phải
z=0. Nếu đặt `<pose>0 0 0 ...</pose>` như trực giác hay làm, robot spawn mặc định (z=0.05, đúng
bán kính bánh xe) sẽ bị lún nửa bánh xuống dưới sàn. Cả `warehouse.sdf` và `office.sdf` đều đã
đặt `<pose>0 0 -0.12432 ...</pose>` cho đúng -- world mới copy từ 2 file này nhớ giữ nguyên số đó.
