"""Nav2: localization (AMCL hoặc slam_toolbox) trên bản đồ đã lưu + costmap/planner/controller
(Module 9-10).

Khai báo TƯỜNG MINH từng node Nav2 (map_server, amcl, controller_server, smoother_server,
planner_server, behavior_server, bt_navigator, waypoint_follower, velocity_smoother, 2
lifecycle_manager) thay vì include nav2_bringup/bringup_launch.py -- để thấy rõ kiến trúc
Nav2 gồm những gì, và có thể sửa/thêm bớt từng node trực tiếp ở đây (đúng tinh thần khóa
học: hiểu từng mảnh, không phải chạy 1 lệnh hộp đen). Cấu trúc/remapping bám sát chính xác
nav2_bringup/launch/{navigation,localization}_launch.py, chỉ viết lại tường minh trong 1 file.

use_composition=True (gộp mọi node vào 1 container) bị treo hoàn toàn trong môi trường test
(container 0% CPU, không load được component nào) -- nên ở đây CHỈ dùng cách mỗi node chạy
process riêng (composition không phải lựa chọn, không phải tham số).

CHỈ chạy Nav2 core + AMCL + RViz -- KHÔNG tự spawn robot/world (cùng nguyên tắc bringup tách
tầng đã áp dụng cho atlas_slam/slam.launch.py và atlas_teleop).

    # Terminal 1: bringup (mô phỏng)
    ros2 launch atlas_control controller.launch.py world:=maze.sdf
    # Terminal 2: Nav2, mặc định AMCL + controller MPPI
    ros2 launch atlas_slam navigation.launch.py
    # ...hoặc chọn controller khác bằng cách đổi file config, không phải sửa code:
    ros2 launch atlas_slam navigation.launch.py controller:=rpp
    ros2 launch atlas_slam navigation.launch.py controller:=dwb
    # ...hoặc dùng slam_toolbox thay AMCL để định vị (cần đã serialize map, xem
    # maps/README.md) -- map:= dùng CHUNG cho cả 2 kiểu, chỉ cần .yaml, slam_toolbox tự
    # suy ra .posegraph/.data cùng tên cùng thư mục:
    ros2 launch atlas_slam navigation.launch.py localization:=slam_toolbox \\
      map:=/đường/dẫn/map1.yaml initial_pose_x:=0.0 initial_pose_y:=0.0 initial_pose_yaw:=0.0

AMCL và slam_toolbox đều làm CÙNG 1 việc (publish transform map->odom để định vị robot trên
map đã có sẵn), khác nhau ở thuật toán: AMCL dùng particle filter (Module 9 lý thuyết chính),
slam_toolbox dùng scan matching + pose graph (cùng thuật toán đã dùng để vẽ map ở Module 8,
giờ chạy ở "mode: localization" thay vì "mode: mapping"). Để trong cùng 1 launch, chọn qua
tham số, cho dễ so sánh 2 cách tiếp cận (bài tập mở rộng của Module 9).

Khác biệt QUAN TRỌNG giữa 2 kiểu lúc khởi động: AMCL không cần biết pose ban đầu ngay lúc
launch (rải particle khắp map, chờ hội tụ) -- chỉ cần đặt "2D Pose Estimate" trong RViz SAU
khi đã chạy. slam_toolbox thì NGƯỢC LẠI: đòi hỏi initial_pose_x/y/yaw đúng NGAY LÚC LAUNCH
(qua map_start_pose) -- thiếu hoặc đặt sai xa vị trí thật, nó không báo "định vị sai" mà báo
lỗi rồi coi như quét map mới toanh (rất dễ nhầm là "map không load được" trong khi bản chất
là thiếu pose ban đầu). Nếu robot không đứng ở (0,0,0) lúc launch, PHẢI truyền đúng
initial_pose_x/y/yaw ước lượng, rồi mới tinh chỉnh thêm bằng "2D Pose Estimate" nếu cần.

So sánh 3 controller (Module 10 bài tập): chạy lần lượt với controller:=dwb / rpp / mppi,
mỗi lần cho robot đi cùng 1 quãng đường (cùng tọa độ goal), so thời gian + quan sát độ mượt
quỹ đạo trong RViz. Script tiện dụng để đo thời gian tự động mỗi lần chạy:

    ros2 run atlas_slam send_goal_and_time.py --goal_x -1.5 --goal_y 1.8
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    GroupAction,
    OpaqueFunction,
    SetEnvironmentVariable,
)
from launch.conditions import IfCondition
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution, PythonExpression
from launch_ros.actions import Node
from launch_ros.descriptions import ParameterFile
from nav2_common.launch import RewrittenYaml


def generate_launch_description():
    slam_pkg_share = get_package_share_directory("atlas_slam")
    nav2_bringup_share = get_package_share_directory("atlas_slam")

    map_arg = DeclareLaunchArgument(
        "map",
        default_value=os.path.join(slam_pkg_share, "maps", "maze_map.yaml"),
        description=(
            "Đường dẫn file .yaml của bản đồ đã lưu (Module 8). Dùng CHUNG cho cả 2 kiểu "
            "định vị: AMCL đọc thẳng file này; slam_toolbox tự suy ra map_file_name bằng "
            "cách bỏ đuôi .yaml (vd map1.yaml -> map1), giả định map1.posegraph/map1.data "
            "nằm CÙNG THƯ MỤC, CÙNG TÊN GỐC -- đúng như map_saver_cli + serialize_map tạo ra "
            "nếu chạy cùng lúc (xem maps/README.md). Không cần tham số slam_map_file riêng."
        ),
    )
    controller_arg = DeclareLaunchArgument(
        "controller",
        default_value="mppi",
        description="Thuật toán controller: dwb | rpp | mppi (ứng với config/nav2_params_<controller>.yaml)",
    )
    localization_arg = DeclareLaunchArgument(
        "localization",
        default_value="amcl",
        description="Kiểu định vị: amcl (particle filter) | slam_toolbox (scan matching, cần đã serialize map)",
    )
    use_sim_time_arg = DeclareLaunchArgument(
        "use_sim_time", default_value="True", description="Dùng đồng hồ mô phỏng Gazebo"
    )
    autostart_arg = DeclareLaunchArgument(
        "autostart", default_value="True", description="Tự động chuyển các lifecycle node sang active"
    )
    rviz_arg = DeclareLaunchArgument(
        "rviz",
        default_value="true",
        description="Có mở RViz (dùng config mặc định của nav2_bringup) hay không",
    )
    initial_pose_x_arg = DeclareLaunchArgument(
        "initial_pose_x", default_value="0.0", description="Chỉ dùng cho localization:=slam_toolbox"
    )
    initial_pose_y_arg = DeclareLaunchArgument(
        "initial_pose_y", default_value="0.0", description="Chỉ dùng cho localization:=slam_toolbox"
    )
    initial_pose_yaw_arg = DeclareLaunchArgument(
        "initial_pose_yaw", default_value="0.0", description="Chỉ dùng cho localization:=slam_toolbox"
    )

    map_yaml_file = LaunchConfiguration("map")
    use_sim_time = LaunchConfiguration("use_sim_time")
    autostart = LaunchConfiguration("autostart")

    # slam_toolbox muốn đường dẫn KHÔNG có đuôi file (map1.posegraph/map1.data), suy ra
    # bằng cách bỏ 5 ký tự cuối (".yaml") của map_yaml_file -- cùng 1 tham số "map" cho cả
    # AMCL lẫn slam_toolbox, không bắt người dùng nhớ 2 tham số khác nhau cho cùng 1 map.
    slam_map_file = PythonExpression(["'", map_yaml_file, "'[:-5]"])

    # slam_toolbox (khác AMCL) BẮT BUỘC phải biết pose ban đầu ngay lúc khởi động (map_start_pose),
    # không có nó sẽ báo lỗi "Map starting pose not specified" và rơi về quét map mới toanh --
    # đây chính là lý do map cũ "biến mất" nếu không set. AMCL không cần (chờ "2D Pose Estimate"
    # trong RViz sau khi đã chạy). Xem slam_toolbox_start_pose_param bên dưới để biết vì sao
    # KHÔNG build tham số này qua RewrittenYaml (tạo ra string, không phải list số thực).

    params_file = PathJoinSubstitution(
        [slam_pkg_share, "config", ["nav2_params_", LaunchConfiguration("controller"), ".yaml"]]
    )

    # RewrittenYaml tiêm use_sim_time/autostart/yaml_filename vào đúng chỗ trong file params
    # lúc launch, thay vì phải sửa tay 3 file config mỗi khi đổi map hoặc bật/tắt sim_time.
    configured_params = ParameterFile(
        RewrittenYaml(
            source_file=params_file,
            root_key="",
            param_rewrites={
                "use_sim_time": use_sim_time,
                "autostart": autostart,
                "yaml_filename": map_yaml_file,
            },
            convert_types=True,
        ),
        allow_substs=True,
    )

    # Config riêng cho slam_toolbox ở chế độ localization -- khác schema với nav2_params
    # (top-level key "slam_toolbox", không phải "amcl"/"map_server"...), nên cần
    # RewrittenYaml riêng, chỉ tiêm use_sim_time + map_file_name (đường dẫn map đã
    # serialize, KHÔNG có đuôi file). KHÔNG tiêm map_start_pose qua đây -- RewrittenYaml chỉ
    # convert_types cho scalar (bool/int/float), chuỗi "[0.0, 0.0, 0.0]" bị ghi thành STRING
    # trong YAML cuối cùng thay vì list số thực, khiến slam_toolbox crash (SIGABRT) vì đọc
    # sai kiểu tham số. map_start_pose truyền riêng bên dưới dưới dạng list Substitution thật.
    slam_toolbox_localization_params = ParameterFile(
        RewrittenYaml(
            source_file=os.path.join(slam_pkg_share, "config", "mapper_params_localization.yaml"),
            root_key="",
            param_rewrites={
                "use_sim_time": use_sim_time,
                "map_file_name": slam_map_file,
            },
            convert_types=True,
        ),
        allow_substs=True,
    )
    def _make_slam_toolbox_node(context, *args, **kwargs):
        # Node(parameters=[{"key": [Substitution, Substitution, ...]}]) KHÔNG tách 3 phần tử
        # thành 3 số double riêng -- launch nối chúng lại thành 1 chuỗi duy nhất (đã tự kiểm
        # chứng: "0.0"+"0.0"+"0.0" -> "0.00.00.0", khiến slam_toolbox đọc sai kiểu tham số và
        # crash SIGABRT y hệt lỗi RewrittenYaml ở trên). Dùng OpaqueFunction để .perform(context)
        # từng LaunchConfiguration RIÊNG LẺ ngay lúc launch, ra đúng 3 số float rồi mới ghép
        # thành 1 list Python thật -- đây mới là cách duy nhất tạo được tham số kiểu double[]
        # có giá trị lấy từ launch argument.
        start_pose = [
            float(LaunchConfiguration("initial_pose_x").perform(context)),
            float(LaunchConfiguration("initial_pose_y").perform(context)),
            float(LaunchConfiguration("initial_pose_yaw").perform(context)),
        ]
        node = Node(
            package="slam_toolbox",
            executable="localization_slam_toolbox_node",
            name="slam_toolbox",
            output="screen",
            parameters=[slam_toolbox_localization_params, {"map_start_pose": start_pose}],
            remappings=remappings,
        )
        return [node]

    is_amcl = PythonExpression(["'", LaunchConfiguration("localization"), "' == 'amcl'"])
    is_slam_toolbox = PythonExpression(
        ["'", LaunchConfiguration("localization"), "' == 'slam_toolbox'"]
    )

    # /tf, /tf_static remap về dạng tương đối -- convention chuẩn của nav2_bringup, để launch
    # này vẫn hoạt động đúng nếu sau này thêm namespace (multi-robot).
    remappings = [("/tf", "tf"), ("/tf_static", "tf_static")]

    stdout_linebuf_envvar = SetEnvironmentVariable("RCUTILS_LOGGING_BUFFERED_STREAM", "1")

    # ============================================================
    # Localization, PHƯƠNG ÁN 1: map_server + amcl (Module 9, mặc định)
    # ============================================================
    amcl_localization_nodes = GroupAction(
        condition=IfCondition(is_amcl),
        actions=[
            Node(
                package="nav2_map_server",
                executable="map_server",
                name="map_server",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_amcl",
                executable="amcl",
                name="amcl",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_lifecycle_manager",
                executable="lifecycle_manager",
                name="lifecycle_manager_localization",
                output="screen",
                parameters=[
                    {
                        "use_sim_time": use_sim_time,
                        "autostart": autostart,
                        "node_names": ["map_server", "amcl"],
                    }
                ],
            ),
        ],
    )

    # ============================================================
    # Localization, PHƯƠNG ÁN 2: slam_toolbox ở mode "localization"
    # ============================================================
    # Node tự publish /map + map->odom, KHÔNG cần map_server hay lifecycle_manager riêng
    # (khác AMCL) -- xem online_async_launch.py ở Module 8 cũng chạy đơn giản kiểu này.
    slam_toolbox_localization_nodes = GroupAction(
        condition=IfCondition(is_slam_toolbox),
        actions=[OpaqueFunction(function=_make_slam_toolbox_node)],
    )

    # ============================================================
    # Navigation core: costmap/planner/controller/BT (Module 10)
    # ============================================================
    navigation_nodes = GroupAction(
        actions=[
            Node(
                package="nav2_controller",
                executable="controller_server",
                name="controller_server",
                output="screen",
                parameters=[configured_params],
                remappings=remappings + [("cmd_vel", "cmd_vel_nav")],
            ),
            Node(
                package="nav2_smoother",
                executable="smoother_server",
                name="smoother_server",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_planner",
                executable="planner_server",
                name="planner_server",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_behaviors",
                executable="behavior_server",
                name="behavior_server",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_bt_navigator",
                executable="bt_navigator",
                name="bt_navigator",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_waypoint_follower",
                executable="waypoint_follower",
                name="waypoint_follower",
                output="screen",
                parameters=[configured_params],
                remappings=remappings,
            ),
            Node(
                package="nav2_velocity_smoother",
                executable="velocity_smoother",
                name="velocity_smoother",
                output="screen",
                parameters=[configured_params],
                # velocity_smoother là chặng cuối: nhận cmd_vel_nav (do controller_server
                # phát ra phía trên) -> lọc mượt -> phát thẳng ra /cmd_vel (đầu vào thật
                # của diff_drive_controller, xem atlas_control). Không qua twist_mux ở
                # bước này -- nếu sau này chạy chung với atlas_bringup/joystick_teleop
                # (có twist_mux), cần đổi output map này thành cmd_vel_nav để twist_mux
                # làm trọng tài cuối cùng thay vì 2 nguồn cùng ghi thẳng vào /cmd_vel.
                remappings=remappings + [("cmd_vel", "cmd_vel_nav"), ("cmd_vel_smoothed", "cmd_vel")],
            ),
            Node(
                package="nav2_lifecycle_manager",
                executable="lifecycle_manager",
                name="lifecycle_manager_navigation",
                output="screen",
                parameters=[
                    {
                        "use_sim_time": use_sim_time,
                        "autostart": autostart,
                        "node_names": [
                            "controller_server",
                            "smoother_server",
                            "planner_server",
                            "behavior_server",
                            "bt_navigator",
                            "waypoint_follower",
                            "velocity_smoother",
                        ],
                    }
                ],
            ),
        ]
    )

    rviz_node = Node(
        package="rviz2",
        executable="rviz2",
        arguments=["-d", os.path.join(nav2_bringup_share, "rviz", "nav2_default_view.rviz")],
        parameters=[{"use_sim_time": use_sim_time}],
        output="screen",
        condition=IfCondition(LaunchConfiguration("rviz")),
    )

    return LaunchDescription(
        [
            stdout_linebuf_envvar,
            map_arg,
            initial_pose_x_arg,
            initial_pose_y_arg,
            initial_pose_yaw_arg,
            controller_arg,
            localization_arg,
            use_sim_time_arg,
            autostart_arg,
            rviz_arg,
            amcl_localization_nodes,
            slam_toolbox_localization_nodes,
            navigation_nodes,
            rviz_node,
        ]
    )
