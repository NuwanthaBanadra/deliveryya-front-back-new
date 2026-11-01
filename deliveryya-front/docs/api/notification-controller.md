# NotificationController API

Source: `src/main/java/com/kaleox/deliveryya/controller/NotificationController.java`
Base path: `/api/v1/notifications`

## Auth Notes

All endpoints in this controller require `Authorization: Bearer <token>`.

## Response Envelope

JSON endpoints return:

```json
{
  "status": 200,
  "message": "Success",
  "desc": "Description",
  "exData": {},
  "object": {}
}
```

`/send-notification-sse` returns an event stream (`text/event-stream`) via `SseEmitter`.

---

## 1) Send Notification

- Method: `POST`
- Path: `/api/v1/notifications/send-notification`
- Auth: `Yes`

### Request Body Sample
```json
{
  "title": "Order Update",
  "notificationType": "ORDER",
  "message": "Order ORD-0001 delivered successfully",
  "toUsers": [5, 9],
  "notifyTo": [1]
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Notification sent successfully"
}
```

---

## 2) Send Notification SSE

- Method: `POST`
- Path: `/api/v1/notifications/send-notification-sse`
- Auth: `Yes`
- Produces: `text/event-stream`

### Request Body Sample
```json
{
  "title": "Live Alert",
  "notificationType": "INFO",
  "message": "Dispatcher online",
  "toUsers": [5],
  "notifyTo": [1]
}
```

### Response Body Sample (SSE)
```text
event: notification
data: {"title":"Live Alert","message":"Dispatcher online"}
```

---

## 3) Get All Notifications (Paginated)

- Method: `POST`
- Path: `/api/v1/notifications/get-all-notifications`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 20
}
```

Note: `userId` is set by the backend using the authenticated principal.

### Response Body Sample
```json
{
  "message": "Success",
  "object": {
    "pageNumber": 0,
    "countPerPage": 20,
    "totalCount": 2,
    "totalPages": 1,
    "userId": 5,
    "items": [
      {
        "id": 101,
        "title": "Order Update",
        "message": "Order ORD-0001 delivered successfully",
        "isRead": false,
        "createdAt": "2026-04-18T09:30:00"
      },
      {
        "id": 102,
        "title": "Payment",
        "message": "Payment received",
        "isRead": true,
        "createdAt": "2026-04-17T15:20:00"
      }
    ]
  }
}
```

---

## 4) Delete Notification

- Method: `DELETE`
- Path: `/api/v1/notifications/delete-notification`
- Auth: `Yes`

### Query Params
- `id` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Notification deleted successfully"
}
```

---

## 5) Mark Notification As Read

- Method: `PUT`
- Path: `/api/v1/notifications/mark-as-read`
- Auth: `Yes`

### Query Params
- `id` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Notification marked as read successfully"
}
```

