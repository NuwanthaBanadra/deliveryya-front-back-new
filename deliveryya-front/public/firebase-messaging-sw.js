// Firebase Cloud Messaging Service Worker
// Must be at the root path (/firebase-messaging-sw.js) for FCM to work

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCYohOuEAVgh0vxpXzXshnLhva7BQ1ui4w",
    authDomain: "deliveryya-3b144.firebaseapp.com",
    projectId: "deliveryya-3b144",
    storageBucket: "deliveryya-3b144.firebasestorage.app",
    messagingSenderId: "961091411423",
    appId: "1:961091411423:web:4cbde151ba376c7697f86a",
    measurementId: "G-Y7NJBE9XKS"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

    const { title = 'New Notification', body = '' } = payload.notification ?? {};

    if (payload.data.type === "REQ_LOCATION") {
        self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: payload.data.type,
                    payload
                });
            });
        });
        return;
    }

    self.registration.showNotification(title, {
        body,
        icon: '/icon_1.png',
        badge: '/icon_1.png',
        data: payload.data,
    });

});
