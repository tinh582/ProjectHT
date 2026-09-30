# HT Parking

**Xây dựng hệ thống tự động nhận diện phương tiện thuê bãi đỗ xe HT** — phiên bản nền tảng quản lý tài khoản và hồ sơ phương tiện cho khách thuê bãi dài hạn.

Backend C# / ASP.NET Core 8, Entity Framework Core và SQLite. Frontend HTML/CSS/JavaScript, giao diện tiếng Việt thích ứng với điện thoại và máy tính.

## Chạy ứng dụng

Tại `T:\ProjectHT`, dùng SDK đã cài cục bộ:

```powershell
.\.dotnet\dotnet.exe run --urls http://localhost:5180
```

Mở http://localhost:5180 và tạo tài khoản mới. Không có tài khoản hoặc dữ liệu mẫu được tạo sẵn. Nếu máy đã cài .NET 8 SDK, thay `.\.dotnet\dotnet.exe` bằng `dotnet`.

## Chức năng

- Đăng ký, đăng nhập, đăng xuất; mật khẩu băm bằng ASP.NET Core PasswordHasher, phiên đăng nhập bằng cookie HttpOnly và kiểm tra CSRF.
- Thêm, sửa, xóa phương tiện: loại xe máy/ô tô, hãng, mẫu, màu sắc, biển số, thời hạn đăng ký 1–120 tháng.
- Chuẩn hóa biển số (bỏ dấu cách, chấm, gạch ngang) và ngăn biển số trùng trên toàn hệ thống. Mẫu kiểm tra hỗ trợ biển số dân dụng thông thường, chưa bao phủ mọi biển số đặc biệt.
- Tìm kiếm xe, thống kê số xe và số xe có ảnh.
- Chọn ảnh hoặc chụp qua trình chọn camera của thiết bị; xem trước, thay thế, xóa ảnh. Trên máy tính nút chụp có thể mở trình chọn tệp tùy trình duyệt.
- Mỗi xe có một ảnh tùy chọn JPEG/PNG tối đa 5 MB. Kiểm tra chữ ký tệp phía server; chưa giải mã và tái mã hóa ảnh.
- Mỗi khách chỉ truy cập được xe và ảnh thuộc tài khoản của mình.

## Dữ liệu

Ứng dụng tự tạo `App_Data/parking.db` khi chạy lần đầu. Ảnh lưu dưới dạng BLOB trong SQLite để thay thế/xóa cùng dữ liệu theo giao dịch và tránh tệp ảnh mồ côi. Sao lưu cơ sở dữ liệu bằng công cụ sao lưu SQLite hoặc dừng ứng dụng trước khi sao chép. Có thể đổi thư mục dữ liệu bằng cấu hình `DataDirectory`.

`Customers`: Id, Name, Email (unique), PasswordHash.

`Vehicles`: Id, CustomerId (khóa ngoại), Type, Brand, Model, Color, Plate (unique), Months, Photo, PhotoContentType.

Đây là cơ sở dữ liệu khởi tạo bằng `EnsureCreated`. Khi thay đổi cấu trúc dữ liệu thực tế, cần bổ sung EF migrations và quy trình nâng cấp.

## API

| Method | Đường dẫn | Chức năng |
|---|---|---|
| GET | `/api/csrf` | Nhận token CSRF và cookie |
| POST | `/api/auth/register` | `{name,email,password}` |
| POST | `/api/auth/login` | `{email,password}` |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Tài khoản hiện tại |
| GET | `/api/vehicles/` | Danh sách xe của khách |
| POST | `/api/vehicles/` | Thêm xe, trả 201 và id |
| PUT | `/api/vehicles/{id}` | Sửa xe |
| DELETE | `/api/vehicles/{id}` | Xóa xe và ảnh |
| POST | `/api/vehicles/{id}/photo` | Upload multipart/form-data, trường `photo` |
| GET | `/api/vehicles/{id}/photo` | Lấy ảnh có kiểm tra chủ xe |
| DELETE | `/api/vehicles/{id}/photo` | Xóa ảnh |

Payload thêm/sửa xe:

```json
{"type":"Xe máy","brand":"Honda","model":"Vision","color":"Trắng","plate":"59-A1 123.45","months":3}
```

Giữ cookie từ server, gửi header `X-CSRF-TOKEN` cho mọi POST/PUT/DELETE. Lấy token mới sau đăng nhập, đăng ký và đăng xuất vì danh tính phiên thay đổi. Lỗi dữ liệu trả 400, chưa đăng nhập 401, không tìm thấy/không sở hữu 404, email/biển số trùng 409.

Thông tin xe và ảnh được gửi qua hai API riêng. Nếu upload thất bại sau khi lưu xe, form giữ id vừa tạo để khách thử lại mà không tạo trùng xe.

## Kiểm tra

```powershell
.\.dotnet\dotnet.exe build
node --check wwwroot/app.js
node tests/smoke.mjs
```

Kiểm thử tích hợp dùng cổng 5189 và cơ sở dữ liệu tạm độc lập, tự xóa khi kết thúc. Yêu cầu Node.js 22 trở lên, SDK cục bộ và build Debug trước khi chạy.

## Ứng dụng Kiểm tra Mô hình (LicensePlateTestApp)

Dự án bao gồm một ứng dụng web frontend độc lập (Vite + React) dùng để thử nghiệm trực tiếp luồng xử lý Roboflow (Custom Workflow) mà không cần tích hợp vào backend chính. Ứng dụng này dùng để kiểm tra việc tải ảnh lên, vẽ bounding box và nhận diện biển số (license plate number) dựa trên kết quả trả về từ API `serverless.roboflow.com`.

### Cài đặt và Chạy

1. Di chuyển vào thư mục ứng dụng:
   ```powershell
   cd LicensePlateTestApp
   ```
2. Cài đặt các gói phụ thuộc:
   ```powershell
   npm install
   ```
3. Cấu hình API Key:
   - Tạo file `.env` từ file mẫu `.env.example`.
   - Mở file `.env` và thêm khóa API của bạn vào: `VITE_ROBOFLOW_API_KEY=your_api_key` (có thể lấy tại [app.roboflow.com/settings/api](https://app.roboflow.com/settings/api)).
4. Chạy máy chủ phát triển (Dev server):
   ```powershell
   npm run dev
   ```
   Mở đường dẫn (ví dụ: `http://localhost:5173`) trong trình duyệt, tải ảnh mẫu (ví dụ: `sample-plate.jpg` ở thư mục gốc) lên và nhấn "Scan License Plate".

## Phạm vi tiếp theo

Phiên bản này chưa có OCR/AI nhận diện xe, camera cổng, quản lý chỗ trống, hợp đồng, thanh toán, quản trị hoặc xác thực email/khôi phục mật khẩu. `Months` là thời hạn khách đề nghị, chưa phải hợp đồng đã duyệt. Trước khi đưa lên Internet cần cấu hình HTTPS, chống dò mật khẩu/rate limiting, bảo quản khóa Data Protection, quy trình sao lưu và chính sách lưu ảnh.

Tham khảo kỹ thuật: [CSRF trong ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-8.0), [EF Core SQLite 8.0.24](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Sqlite/8.0.24).
