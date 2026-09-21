cmake_minimum_required(VERSION 3.8)
project(atlas_gazebo)

find_package(ament_cmake REQUIRED)

install(
  DIRECTORY worlds launch config urdf
  DESTINATION share/${PROJECT_NAME}
)

ament_package()
