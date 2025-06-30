// サービスワーカーが「push」イベントを受け取ったときの処理
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/ponzu_square.png',
      badge: '/ponzu_square.png',
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 表示された通知がクリックされたときの処理
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("http://localhost:3000")
  );
});