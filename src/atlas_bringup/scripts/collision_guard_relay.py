#!/usr/bin/env python3
"""Cầu nối giữa nav2_collision_monitor và twist_mux (xem giải thích trong
config/collision_monitor.yaml).

nav2_collision_monitor lọc /cmd_vel LIÊN TỤC và luôn publish ra cmd_vel_monitor_out, kể cả
khi không có gì nguy hiểm (action_type = DO_NOTHING). Node này theo dõi /collision_monitor_state
(nav2_msgs/CollisionMonitorState) để biết KHI NÀO collision_monitor thực sự đang can thiệp
(STOP/SLOWDOWN/APPROACH), và CHỈ lúc đó mới forward giá trị đã lọc sang /cmd_vel_collision --
slot ưu tiên cao nhất trong twist_mux (atlas_bringup/config/joystick_teleop.yaml). Khi hết
nguy hiểm (action_type quay về DO_NOTHING), ngừng forward, để twist_mux tự hết timeout
(0.5s, xem cmd_vel_collision.timeout) và rơi về nguồn ưu tiên thấp hơn như bình thường.
"""

import rclpy
from geometry_msgs.msg import Twist
from nav2_msgs.msg import CollisionMonitorState
from rclpy.node import Node


class CollisionGuardRelay(Node):
    def __init__(self):
        super().__init__("collision_guard_relay")

        self._active = False
        self._latest_safe_cmd = Twist()

        self.create_subscription(
            CollisionMonitorState, "/collision_monitor_state", self._on_state, 10
        )
        self.create_subscription(
            Twist, "/cmd_vel_monitor_out", self._on_monitor_output, 10
        )
        self.pub = self.create_publisher(Twist, "/cmd_vel_collision", 10)

        # Republish đều đặn trong lúc đang can thiệp, không chỉ khi có message mới --
        # tránh cmd_vel_collision bị twist_mux coi là "hết hạn" (timeout 0.5s) giữa 2 lần
        # collision_monitor publish nếu tần số của nó thấp hơn dự kiến.
        self.create_timer(0.1, self._republish_if_active)

    def _on_state(self, msg: CollisionMonitorState):
        was_active = self._active
        self._active = msg.action_type != CollisionMonitorState.DO_NOTHING
        if self._active and not was_active:
            self.get_logger().warn(
                f"Collision monitor can thiệp: {msg.polygon_name} "
                f"(action_type={msg.action_type}) -> forward sang /cmd_vel_collision"
            )
        elif was_active and not self._active:
            self.get_logger().info("Hết nguy hiểm, ngừng forward /cmd_vel_collision")

    def _on_monitor_output(self, msg: Twist):
        self._latest_safe_cmd = msg
        if self._active:
            self.pub.publish(msg)

    def _republish_if_active(self):
        if self._active:
            self.pub.publish(self._latest_safe_cmd)


def main():
    rclpy.init()
    node = CollisionGuardRelay()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
