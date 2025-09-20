module.exports = {
  expo: {
    name: "health-app",
    android: {
      permissions: [
        "ACTIVITY_RECOGNITION",
        "FOREGROUND_SERVICE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
      ],
      package: "com.yourapp.healthapp",
    },
    plugins: [
      "expo-router",
      [
        "expo-sensors",
        {
          motionPermission:
            "Allow $(PRODUCT_NAME) to access your motion activity and step count.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#ffffff",
        },
      ],
    ],
  },
};
